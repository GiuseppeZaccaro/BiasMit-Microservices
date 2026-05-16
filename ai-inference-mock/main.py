from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
import pandas as pd
import pyarrow as pa
import pyarrow.ipc as ipc
import json
import os
import numpy as np
import ast
import traceback
import config_manager

app = FastAPI(title="BiasMit AI Inference Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_BASE_PATH    = os.getenv("DATA_BASE_PATH",    "/app/data/datasets")
RESULTS_BASE_PATH = os.getenv("RESULTS_BASE_PATH", "/app/data/results")
STATS_BASE_PATH   = os.getenv("STATS_BASE_PATH",   "/app/data/stats")


# --- REGISTRY ENDPOINTS ---

@app.get("/models")
def get_models():
    """Returns the list of registered models from models.yaml."""
    models = config_manager.load_models()
    return [
        {k: v for k, v in m.items() if k != "results"}
        for m in models
    ]

@app.get("/datasets")
def get_datasets():
    """Returns datasets auto-discovered from the data folder (require metadata.json + .arrow/.jsonl)."""
    return config_manager.discover_datasets()


# --- FUNZIONI DI SUPPORTO (CARICAMENTO BINARIO) ---

def load_stereoset_df():
    """Carica il file StereoSet provando tutti i formati Arrow possibili."""
    file_path = os.path.join(DATA_BASE_PATH, "stereoset", "intrasentence.arrow")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File non trovato: {file_path}")

    try:
        return pd.read_feather(file_path)
    except Exception:
        pass

    try:
        with pa.memory_map(file_path, 'r') as source:
            return ipc.open_file(source).read_all().to_pandas()
    except Exception:
        pass

    try:
        with open(file_path, 'rb') as f:
            return ipc.open_stream(f).read_all().to_pandas()
    except Exception:
        pass

    try:
        return pd.read_parquet(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impossibile leggere il file binario StereoSet: {str(e)}")


# --- HELPERS BBQ ---

def normalize_bbq_response(raw_val, target_data):
    val = str(raw_val).strip().lower()
    if not val or val == "nan": return "N/A"
    if val[0] in ['a', 'b', 'c'] and (len(val) == 1 or not val[1].isalpha()):
        return val[0].upper()

    if target_data:
        options = {"A": str(target_data.get('ans0', '')).lower(),
                   "B": str(target_data.get('ans1', '')).lower(),
                   "C": str(target_data.get('ans2', '')).lower()}
        for letter, text in options.items():
            if text and (text in val or val in text): return letter
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
    except: return "Error"


# --- HELPER STEREOSET ---

def find_ss_response(file_path, bias_type, target_word):
    if not os.path.exists(file_path):
        return "File missing"
    try:
        df = pd.read_csv(file_path)
        df.columns = [c.lower().strip() for c in df.columns]
        if 'target_group' in df.columns:
            df = df.rename(columns={'target_group': 'target'})

        if 'bias_type' in df.columns:
            df['bias_type'] = df['bias_type'].astype(str).str.lower().str.strip()
        if 'target' in df.columns:
            df['target'] = df['target'].astype(str).str.lower().str.strip()

        res = pd.DataFrame()
        if 'target' in df.columns:
            res = df[(df['bias_type'] == bias_type.lower()) &
                     (df['target'] == str(target_word).lower())]
        elif 'bias_type' in df.columns:
            res = df[df['bias_type'] == bias_type.lower()]

        if not res.empty:
            return {
                "stereo":     round(float(res.iloc[0].get('ll_stereo', 0)), 4),
                "anti":       round(float(res.iloc[0].get('ll_anti', 0)), 4),
                "unrelated":  round(float(res.iloc[0].get('ll_unrelated', 0)), 4),
            }
        return "N/A (No match)"
    except Exception as e:
        return f"Error: {str(e)}"


# --- ENDPOINT REPORT (TESTO PURO) ---

@app.get("/metrics/{model}/report/{method}", response_class=PlainTextResponse)
def get_model_report(model: str, method: str):
    """Restituisce il contenuto del file .txt esattamente come salvato su disco."""
    file_name = f"report_{method.lower()}.txt"
    file_path = os.path.join(STATS_BASE_PATH, model.lower(), file_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File non trovato: {file_path}")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- ENDPOINTS BBQ ---

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
    questions = get_bbq_questions(category, limit=example_id + 100)
    target = next((q for q in questions if q.get('example_id') == example_id), None)
    if not target: raise HTTPException(404, "ID not found")

    model_dir = os.path.join(RESULTS_BASE_PATH, model.lower())
    result_files = config_manager.get_model_result_files(model, 'bbq')
    comparison = {
        key: find_bbq_response(os.path.join(model_dir, fname), category, example_id, target)
        for key, fname in result_files.items()
    }
    return {"original_data": target, "comparison": comparison}


# --- HELPER STEREOSET SENTENCES ---

def _decode_ss_label(lbl):
    int_map = {0: 'stereo', 1: 'anti', 2: 'unrelated'}
    str_map = {'stereotype': 'stereo', 'anti-stereotype': 'anti', 'unrelated': 'unrelated'}
    if isinstance(lbl, (int, np.integer)):
        return int_map.get(int(lbl))
    return str_map.get(str(lbl).lower().strip())


def extract_ss_sentences(row):
    sentences_map = {}
    try:
        if 'sentences' not in row.index:
            return sentences_map
        raw = row['sentences']
        if raw is None:
            return sentences_map
        if isinstance(raw, float) and np.isnan(raw):
            return sentences_map

        if isinstance(raw, dict):
            sentence_arr = raw.get('sentence', [])
            gold_label_arr = raw.get('gold_label', [])
            for sent, lbl in zip(sentence_arr, gold_label_arr):
                key = _decode_ss_label(lbl)
                if key and sent:
                    sentences_map[key] = str(sent)
            return sentences_map

        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except Exception:
                try:
                    raw = ast.literal_eval(raw)
                except Exception:
                    return sentences_map

        if not isinstance(raw, (list, np.ndarray)):
            return sentences_map

        for s in raw:
            if isinstance(s, dict):
                lbl = s.get('gold_label', '')
                txt = s.get('sentence', '')
                key = _decode_ss_label(lbl)
                if key and txt:
                    sentences_map[key] = txt
    except Exception:
        pass
    return sentences_map


# --- ENDPOINTS STEREOSET ---

@app.get("/stereoset/categories")
def get_stereoset_categories():
    df = load_stereoset_df()
    return sorted(df['bias_type'].unique().tolist())

@app.get("/stereoset/category/{category}/questions")
def get_ss_questions(category: str, limit: int = 100):
    try:
        df = load_stereoset_df()
        filtered = df[df['bias_type'].str.lower() == category.lower()].head(limit)
        records = json.loads(filtered.fillna("N/A").to_json(orient="records"))

        for rec in records:
            if rec.get('sentence') and rec['sentence'] != 'N/A':
                rec['display_sentence'] = rec['sentence']
            else:
                sentences_raw = rec.get('sentences')
                display = None

                if isinstance(sentences_raw, dict):
                    sentence_arr = sentences_raw.get('sentence', [])
                    gold_label_arr = sentences_raw.get('gold_label', [])
                    for sent, lbl in zip(sentence_arr, gold_label_arr):
                        if _decode_ss_label(lbl) == 'stereo':
                            display = str(sent)
                            break

                elif isinstance(sentences_raw, str) and sentences_raw not in ('N/A', ''):
                    try:
                        sentences_raw = json.loads(sentences_raw)
                    except Exception:
                        try:
                            sentences_raw = ast.literal_eval(sentences_raw)
                        except Exception:
                            sentences_raw = None
                    if isinstance(sentences_raw, list):
                        for s in sentences_raw:
                            if isinstance(s, dict) and _decode_ss_label(s.get('gold_label', '')) == 'stereo':
                                display = s.get('sentence')
                                break

                rec['display_sentence'] = display or rec.get('target', '')

        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stereoset/comparison/{model}/{category}/{example_id}")
def get_ss_comparison(model: str, category: str, example_id: int):
    try:
        df_all = load_stereoset_df()
        df_cat = df_all[df_all['bias_type'].str.lower() == category.lower()]
        if example_id >= len(df_cat): raise HTTPException(404, "ID not found")

        target_row = df_cat.iloc[example_id]
        original_data = json.loads(pd.DataFrame([target_row]).fillna("N/A").to_json(orient="records"))[0]

        sentences_map = extract_ss_sentences(target_row)

        if not sentences_map and 'sentence' in df_cat.columns and 'gold_label' in df_cat.columns:
            target_word_val = str(target_row['target']).strip()
            siblings = df_cat[df_cat['target'].astype(str).str.strip() == target_word_val]
            label_map = {"stereotype": "stereo", "anti-stereotype": "anti", "unrelated": "unrelated"}
            for _, sib in siblings.iterrows():
                lbl = str(sib.get('gold_label', '')).strip()
                txt = str(sib.get('sentence', '')).strip()
                if lbl and txt and txt.lower() != 'n/a':
                    sentences_map[label_map.get(lbl, lbl)] = txt

        target_word = str(target_row['target'])
        model_dir = os.path.join(RESULTS_BASE_PATH, model.lower())
        result_files = config_manager.get_model_result_files(model, 'stereoset')
        comparison = {
            key: find_ss_response(os.path.join(model_dir, fname), category, target_word)
            for key, fname in result_files.items()
        }

        return {"original_data": original_data, "sentences": sentences_map, "comparison": comparison}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def root():
    models = [m["id"] for m in config_manager.load_models()]
    datasets = [d["id"] for d in config_manager.discover_datasets()]
    return {"status": "active", "models": models, "datasets": datasets}
