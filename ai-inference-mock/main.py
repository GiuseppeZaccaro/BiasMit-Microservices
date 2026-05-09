from fastapi import FastAPI, HTTPException, Query
import pandas as pd
import pyarrow as pa
import pyarrow.ipc as ipc
import json
import os
import numpy as np
import traceback

#creo l'istanza dell'applicazione API
app = FastAPI(title="BiasMit AI Inference Mock Service")

# --- CONFIGURAZIONE PERCORSI ---
DATA_BASE_PATH = "/app/data/datasets"
RESULTS_BASE_PATH = "/app/data/results"

#dizionario che mappa i nomi dei metodi ai rispettivi file CSV per BBQ
BBQ_FILES = {
    "baseline": "baseline_bbq_full.csv",
    "caa_puntuale": "steered_bbq_L16_puntuale_categoriale.csv",
    "caa_block": "steered_bbq_Block16-22_categoriale.csv",
    "fairsteer": "risultati_bbq_FairSteer_L16_categoriale.csv"
}

#dizionario che mappa i nomi dei metodi ai rispettivi file CSV per StereoSet
STEREOSET_FILES = {
    "baseline": "baseline_stereoset_full.csv",
    "caa_puntuale": "steered_stereoset_L16_puntuale_categoriale.csv",
    "caa_block": "steered_stereoset_Block16-22_categoriale.csv",
    "fairsteer": "risultati_ss_FairSteer_L16_categoriale_k_ss-0.5.csv"
}

# --- FUNZIONI DI SUPPORTO (CARICAMENTO BINARIO) ---

def load_stereoset_df():
    """Carica il file StereoSet provando tutti i formati Arrow possibili."""
    file_path = os.path.join(DATA_BASE_PATH, "stereoset", "intrasentence.arrow")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File non trovato: {file_path}")

    # 1. Tentativo: Feather V1/V2 (Standard pandas)
    try:
        return pd.read_feather(file_path)
    except Exception:
        pass

    # 2. Tentativo: IPC File format (pyarrow)
    try:
        with pa.memory_map(file_path, 'r') as source:
            return ipc.open_file(source).read_all().to_pandas()
    except Exception:
        pass

    # 3. Tentativo: IPC Stream format
    try:
        with open(file_path, 'rb') as f:
            return ipc.open_stream(f).read_all().to_pandas()
    except Exception:
        pass

    # 4. Tentativo: Parquet (nel caso l'estensione sia fuorviante)
    try:
        return pd.read_parquet(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impossibile leggere il file binario StereoSet: {str(e)}")

# --- HELPERS BBQ ---
#funzione che pulisce la risposta per capire quale opzione è stata scelta dato che spesso i modelli rispondono con testo libero
def normalize_bbq_response(raw_val, target_data):
    """Trasforma testo libero in A, B o C confrontandolo con le risposte corrette."""
    val = str(raw_val).strip().lower()
    if not val or val == "nan": return "N/A"
    #se la risposta nizia già con a.b o c, la prende direttamente
    if val[0] in ['a', 'b', 'c'] and (len(val) == 1 or not val[1].isalpha()):
        return val[0].upper()
    
    # Altrimenti, cerchiamo se il testo della risposta contiene il testo di ans0, ans1 o ans2
    if target_data:
        options = {"A": str(target_data.get('ans0', '')).lower(),
                   "B": str(target_data.get('ans1', '')).lower(),
                   "C": str(target_data.get('ans2', '')).lower()}
        for letter, text in options.items():
            if text and (text in val or val in text): return letter
    return val[:15]# Ritorna i primi 15 caratteri se non riesce a mappare

def find_bbq_response(file_path, category, example_id, target_data):
    """Cerca la risposta specifica di un modello in un file CSV di risultati."""
    if not os.path.exists(file_path): return "File missing"
    try:
        df = pd.read_csv(file_path, engine='python')
        # Filtra per categoria e prendi l'esempio all'indice indicato
        res = df[df['Category'].str.lower() == category.lower()]
        if example_id < len(res):
            raw_val = res.iloc[example_id]['Model_Response']
            return normalize_bbq_response(raw_val, target_data)
        return "N/A"
    except: return "Error"

# --- HELPER STEREOSET (RICERCA MULTI-STRUTTURA) ---

def find_ss_response(file_path, bias_type, target_word):
    """Cerca i punteggi Stereo/Anti/Unrelated per una specifica parola target."""
    if not os.path.exists(file_path): 
        return "File missing"
    try:
        df = pd.read_csv(file_path)
        
        # Normalizzazione colonne (gestisce FairSteer target_group e case-sensitivity)
        df.columns = [c.lower().strip() for c in df.columns]
        if 'target_group' in df.columns:#gestione specifica per FairSteer
            df = df.rename(columns={'target_group': 'target'})

        # Pulizia dati per il match
        if 'bias_type' in df.columns:
            df['bias_type'] = df['bias_type'].astype(str).str.lower().str.strip()
        if 'target' in df.columns:
            df['target'] = df['target'].astype(str).str.lower().str.strip()

        # Logica di ricerca differenziata
        res = pd.DataFrame()
        
        # Caso 1: Ricerca specifica per parola target (CAA e FairSteer)
        if 'target' in df.columns:
            res = df[(df['bias_type'] == bias_type.lower()) & 
                     (df['target'] == str(target_word).lower())]
        
        # Caso 2: Ricerca aggregata per categoria (Baseline)
        elif 'bias_type' in df.columns:
            res = df[df['bias_type'] == bias_type.lower()]

        if not res.empty:
            return {
                "stereo": round(float(res.iloc[0].get('ll_stereo', 0)), 4),
                "anti": round(float(res.iloc[0].get('ll_anti', 0)), 4),
                "unrelated": round(float(res.iloc[0].get('ll_unrelated', 0)), 4)
            }
        
        return "N/A (No match)"
    except Exception as e:
        return f"Error: {str(e)}"

# --- ENDPOINTS ---

@app.get("/bbq/categories")
def get_bbq_categories():
    bbq_dir = os.path.join(DATA_BASE_PATH, "bbq")
    if not os.path.exists(bbq_dir): return []
    return sorted([f.replace(".jsonl", "") for f in os.listdir(bbq_dir) if f.endswith(".jsonl")])

@app.get("/bbq/category/{category}/questions")
def get_bbq_questions(category: str, limit: int = 100):
    file_path = os.path.join(DATA_BASE_PATH, "bbq", f"{category.lower()}.jsonl")
    if not os.path.exists(file_path): raise HTTPException(404, "Category not found")
    with open(file_path, 'r', encoding='utf-8') as f:
        return [json.loads(line) for i, line in enumerate(f) if i < limit]

@app.get("/bbq/comparison/{model}/{category}/{example_id}")
def get_bbq_comparison(model: str, category: str, example_id: int):
    """
    Punto centrale: per un dato esempio di BBQ, recupera i dati originali
    e confronta come hanno risposto i 4 diversi metodi (baseline, caa, etc.)
    """
    questions = get_bbq_questions(category, limit=example_id + 100)
    target = next((q for q in questions if q.get('example_id') == example_id), None)
    if not target: raise HTTPException(404, "ID not found")
    model_dir = os.path.join(RESULTS_BASE_PATH, model.lower())
    comparison = {key: find_bbq_response(os.path.join(model_dir, fname), category, example_id, target)
                  for key, fname in BBQ_FILES.items()}
    return {"original_data": target, "comparison": comparison}

# --- STEREOSET ---

@app.get("/stereoset/categories")
def get_stereoset_categories():
    df = load_stereoset_df()
    return sorted(df['bias_type'].unique().tolist())

@app.get("/stereoset/category/{category}/questions")
def get_ss_questions(category: str, limit: int = 100):
    try:
        df = load_stereoset_df()
        filtered = df[df['bias_type'].str.lower() == category.lower()].head(limit)
        return json.loads(filtered.fillna("N/A").to_json(orient="records"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stereoset/comparison/{model}/{category}/{example_id}")
def get_ss_comparison(model: str, category: str, example_id: int):
    """Simile a BBQ, ma per StereoSet: estrae i punteggi numerici di probabilità."""
    try:
        df_all = load_stereoset_df()
        df_cat = df_all[df_all['bias_type'].str.lower() == category.lower()]
        if example_id >= len(df_cat): raise HTTPException(404, "ID not found")

        target_row = df_cat.iloc[example_id]
        original_data = json.loads(pd.DataFrame([target_row]).fillna("N/A").to_json(orient="records"))[0]

        target_word = target_row['target']
        model_dir = os.path.join(RESULTS_BASE_PATH, model.lower())
        # Estrae i punteggi da tutti i CSV di StereoSet per il confronto
        comparison = {key: find_ss_response(os.path.join(model_dir, fname), category, target_word)
                      for key, fname in STEREOSET_FILES.items()}

        return {"original_data": original_data, "comparison": comparison}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"status": "active", "datasets": ["bbq", "stereoset"]}