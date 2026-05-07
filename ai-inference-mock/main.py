from fastapi import FastAPI, HTTPException
import pandas as pd
import json
import os

app = FastAPI(title="BiasMit AI Inference Mock Service")

# --- CONFIGURAZIONE PERCORSI (Assoluti per Docker) ---
DATA_BASE_PATH = "/app/data/datasets"
RESULTS_BASE_PATH = "/app/data/results"

BBQ_FILES = {
    "baseline": "baseline_bbq_full.csv",
    "caa_puntuale": "steered_bbq_L16_puntuale_categoriale.csv",
    "caa_block": "steered_bbq_Block16-22_categoriale.csv",
    "fairsteer": "risultati_bbq_FairSteer_L16_categoriale.csv"
}

STEREOSET_FILES = {
    "baseline": "baseline_stereoset_full.csv",
    "caa_puntuale": "steered_stereoset_L16_puntuale.csv",
    "caa_block": "steered_stereoset_Block16-22.csv",
    "fairsteer": "risultati_ss_FairSteer_L16.csv"
}

# --- FUNZIONI DI SUPPORTO ---

def load_stereoset_df():
    """Carica il file StereoSet con diagnostica per i volumi Docker."""
    file_path = os.path.join(DATA_BASE_PATH, "stereoset", "intrasentence.arrow")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"DEBUG: File non trovato in {file_path}")
    
    size = os.path.getsize(file_path)
    if size < 100:
        raise HTTPException(status_code=500, detail=f"DEBUG: Errore Volume. Il file pesa solo {size} byte.")

    try:
        return pd.read_feather(file_path)
    except Exception as e:
        try:
            return pd.read_parquet(file_path)
        except Exception:
            raise HTTPException(status_code=500, detail=f"DEBUG: Errore formato/pyarrow: {str(e)}")

def normalize_bbq_response(raw_val, target_data):
    """
    Normalizzazione UNIVERSALE: Mappa il testo della risposta alla lettera A, B o C
    confrontandolo con le opzioni dinamiche della domanda (ans0, ans1, ans2).
    """
    val = str(raw_val).strip().lower()
    if not val or val == "nan": return "N/A"
    
    # 1. Se inizia già con una lettera valida (es. "A", "B.", "C) Text")
    if val[0] in ['a', 'b', 'c']:
        if len(val) == 1 or not val[1].isalpha():
            return val[0].upper()
    
    # 2. Match dinamico basato sui testi delle risposte (Generalizzato per ogni categoria)
    if target_data:
        options = {
            "A": str(target_data.get('ans0', '')).lower(),
            "B": str(target_data.get('ans1', '')).lower(),
            "C": str(target_data.get('ans2', '')).lower()
        }
        for letter, text in options.items():
            if text and (text in val or val in text):
                return letter
                
    # 3. Fallback: restituisce i primi 15 caratteri se non riesce a mappare
    return val[:15]

def find_bbq_response(file_path, category, example_id, target_data):
    if not os.path.exists(file_path): return "File missing"
    try:
        df = pd.read_csv(file_path, engine='python')
        res = df[df['Category'].str.lower() == category.lower()]
        if example_id < len(res):
            raw_val = res.iloc[example_id]['Model_Response']
            return normalize_bbq_response(raw_val, target_data)
        return "N/A"
    except:
        return "Error"

def find_ss_response(file_path, bias_type, target_word):
    if not os.path.exists(file_path): return "File missing"
    try:
        df = pd.read_csv(file_path)
        res = df[(df['bias_type'].str.lower() == bias_type.lower()) & 
                 (df['target'].astype(str).str.lower() == target_word.lower())]
        if not res.empty:
            return {
                "stereo": round(float(res.iloc[0]['ll_stereo']), 4),
                "anti": round(float(res.iloc[0]['ll_anti']), 4)
            }
        return "N/A"
    except:
        return "Error"

# --- ENDPOINTS BBQ ---

@app.get("/bbq/categories")
def get_bbq_categories():
    bbq_dir = os.path.join(DATA_BASE_PATH, "bbq")
    if not os.path.exists(bbq_dir): return []
    return [f.replace(".jsonl", "") for f in os.listdir(bbq_dir) if f.endswith(".jsonl")]

@app.get("/bbq/category/{category}/questions")
def get_bbq_questions(category: str, limit: int = 100):
    file_path = os.path.join(DATA_BASE_PATH, "bbq", f"{category.lower()}.jsonl")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Categoria {category} non trovata.")
    questions = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i >= limit: break
            questions.append(json.loads(line))
    return questions

@app.get("/bbq/comparison/{model}/{category}/{example_id}")
def get_bbq_comparison(model: str, category: str, example_id: int):
    # Carica la domanda specifica per ottenere i testi delle risposte per la normalizzazione
    questions = get_bbq_questions(category, limit=example_id + 100)
    target = next((q for q in questions if q.get('example_id') == example_id), None)
    if not target: raise HTTPException(404, "Example ID not found")

    model_dir = os.path.join(RESULTS_BASE_PATH, model.lower())
    comparison = {key: find_bbq_response(os.path.join(model_dir, fname), category, example_id, target) 
                  for key, fname in BBQ_FILES.items()}
    return {"original_data": target, "comparison": comparison}

# --- ENDPOINTS STEREOSET ---

@app.get("/stereoset/categories")
def get_stereoset_categories():
    df = load_stereoset_df()
    return df['bias_type'].unique().tolist()

@app.get("/stereoset/category/{category}/questions")
def get_ss_questions(category: str, limit: int = 100):
    df = load_stereoset_df()
    filtered = df[df['bias_type'].str.lower() == category.lower()]
    return filtered.head(limit).fillna("N/A").to_dict(orient="records")

@app.get("/stereoset/comparison/{model}/{category}/{example_id}")
def get_ss_comparison(model: str, category: str, example_id: int):
    df_all = load_stereoset_df()
    df_cat = df_all[df_all['bias_type'].str.lower() == category.lower()]
    
    if example_id >= len(df_cat): 
        raise HTTPException(404, f"ID {example_id} non esistente per {category}")
    
    target_row = df_cat.iloc[example_id]
    target_word = target_row['target']
    
    model_dir = os.path.join(RESULTS_BASE_PATH, model.lower())
    comparison = {key: find_ss_response(os.path.join(model_dir, fname), category, target_word) 
                  for key, fname in STEREOSET_FILES.items()}
    
    return {
        "original_data": target_row.fillna("N/A").to_dict(), 
        "comparison": comparison
    }

@app.get("/")
def root():
    return {
        "status": "active", 
        "data_mount": os.path.exists(DATA_BASE_PATH),
        "available_endpoints": ["/bbq/categories", "/stereoset/categories"]
    }