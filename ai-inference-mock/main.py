from fastapi import FastAPI, HTTPException
import pandas  as pd
import json
import os

# Inizializzazione dell'API con titolo descrittivo per la documentazione automatica
app = FastAPI(title="LLM Steering Comparison Hub - API")

# Percorso radice dove Docker monta la cartella dei dati
DATA_PATH = "/app/data"

# =================================================================
# SEZIONE BBQ: Gestione file JSONL (Dataset) e CSV (Risultati)
# =================================================================

@app.get("/bbq/category/{category}/questions")
def get_bbq_questions(category: str):
    """
    Recupera i primi 100 esempi per una specifica categoria BBQ.
    Serve per popolare la lista di selezione nell'interfaccia grafica.
    """
    file_path = f"{DATA_PATH}/datasets/bbq/{category.lower()}.jsonl"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File BBQ per {category} non trovato")
    
    questions = []
    with open(file_path, 'r') as f:
        for i, line in enumerate(f):
            if i >= 100: break # Limite di 100 record per la demo
            data = json.loads(line)
            questions.append({
                "id": i,
                "context": data.get("context", ""),
                "question": data.get("question", "")
            })
    return questions

@app.get("/bbq/comparison/{model}/{category}/{example_id}")
def get_bbq_comparison(model: str, category: str, example_id: int):
    """
    Incrocia il prompt originale (JSONL) con le risposte dei modelli (CSV).
    Restituisce un confronto tra Baseline, CAA e FairSteer.
    """
    # 1. Recupero del dato originale dal file JSONL
    jsonl_path = f"{DATA_PATH}/datasets/bbq/{category.lower()}.jsonl"
    with open(jsonl_path, 'r') as f:
        lines = f.readlines()
        if example_id >= len(lines):
             raise HTTPException(status_code=404, detail="ID fuori portata")
        original = json.loads(lines[example_id])

    # 2. Iterazione sui tre metodi per recuperare i risultati dai CSV
    methods = ["baseline", "caa", "fairsteer"]
    comparison = {}

    for method in methods:
        csv_path = f"{DATA_PATH}/results/{model}/{method}_bbq.csv"
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            # Filtriamo per categoria per garantire l'allineamento degli indici
            cat_df = df[df['Category'].str.lower() == category.lower()]
            
            if example_id < len(cat_df):
                row = cat_df.iloc[example_id]
                comparison[method] = {
                    "response": row['Model_Response'],
                    # Gestione dinamica delle colonne extra (Layers, Steering_Type)
                    "extra": row.get('Layers', row.get('Layer', row.get('Steering_Type', "")))
                }
    
    return {
        "original_data": {
            "context": original["context"],
            "question": original["question"],
            "answers": {"ans0": original["ans0"], "ans1": original["ans1"], "ans2": original["ans2"]},
            "label": original["label"]
        },
        "comparison": comparison
    }

# =================================================================
# SEZIONE STEREOSET: Gestione file ARROW (Dataset) e CSV (Risultati)
# =================================================================

@app.get("/stereoset/list/{test_type}")
def get_stereoset_list(test_type: str):
    """
    Legge il file binario Arrow e restituisce i primi 100 record.
    test_type può essere 'intrasentence' o 'intersentence'.
    """
    file_path = f"{DATA_PATH}/datasets/stereoset/{test_type}.arrow"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File Arrow non trovato")
    
    # pandas legge nativamente il formato Arrow in modo molto efficiente
    df = pd.read_arrow(file_path).head(100)
    return df.to_dict(orient="records")

@app.get("/stereoset/comparison/{model}/{test_type}/{example_id}")
def get_ss_comparison(model: str, test_type: str, example_id: int):
    """
    Estrae il record dallo StereoSet Arrow e calcola la scelta del modello 
    basandosi sulla Log-Likelihood più alta presente nei CSV.
    """
    # 1. Decodifica del record originale dal file Arrow
    arrow_path = f"{DATA_PATH}/datasets/stereoset/{test_type}.arrow"
    df_ss = pd.read_arrow(arrow_path)
    if example_id >= len(df_ss):
        raise HTTPException(status_code=404, detail="ID StereoSet fuori portata")
    
    row_data = df_ss.iloc[example_id]

    # Mappatura delle label numeriche definite nello schema Arrow
    labels_map = {0: "anti-stereotype", 1: "stereotype", 2: "unrelated"}
    
    # Estrazione delle frasi: associamo il testo alla sua tipologia (gold_label)
    formatted_sentences = {}
    raw_sentences = row_data['sentences']
    for i in range(len(raw_sentences['sentence'])):
        l_idx = raw_sentences['gold_label'][i]
        l_text = labels_map.get(l_idx, "unknown")
        formatted_sentences[l_text] = raw_sentences['sentence'][i]

    # 2. Analisi dei risultati dai CSV di StereoSet
    methods = ["baseline", "caa", "fairsteer"]
    comparison = {}

    for method in methods:
        csv_path = f"{DATA_PATH}/results/{model}/{method}_ss.csv"
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            if example_id < len(df):
                row = df.iloc[example_id]
                
                # Calcolo della scelta del modello: vince la Log-Likelihood maggiore
                scores = {
                    "stereotype": row['ll_stereo'],
                    "anti-stereotype": row['ll_anti'],
                    "unrelated": row['ll_unrelated']
                }
                winner_key = max(scores, key=scores.get)
                
                comparison[method] = {
                    "scores": scores,
                    "winner": winner_key,
                    "winner_text": formatted_sentences.get(winner_key, "N/A"),
                    # Gestione colonne specifiche per CAA (exp_layers) e FairSteer (layer)
                    "layers": row.get('exp_layers', row.get('layer', "N/D")),
                    "type": row.get('exp_name', row.get('steering_type', "N/D"))
                }

    return {
        "original_data": {
            "target": row_data["target"],
            "bias_type": row_data["bias_type"],
            "context": row_data["context"],
            "sentences": formatted_sentences
        },
        "comparison": comparison
    }