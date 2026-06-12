"""
Shared configuration module — Python 3.9 compatible.
Loaded by ai-inference-service and ai-analytics-service via Docker volume mount.
"""
import os #libreria per leggere variabili d'ambiente e verificare i percorsi sul filesystem
import json
from typing import List, Optional #importanti per typing e compatibilità

#pattern per dipendenze opzionali che evita crash improvvisi
try:
    import yaml
    _YAML_AVAILABLE = True
except ImportError:
    _YAML_AVAILABLE = False #uso json come fallback

#CONFIGURAZIONE DINAMICA
#percorsi dei file di configurazione dei modelli e dei datasets
#se non impostate le variabili uso il percorso dove Docker monta il volume condiviso /app/models.yaml
MODELS_CONFIG_PATH = os.getenv("MODELS_CONFIG_PATH", "/app/models.yaml")
DATA_BASE_PATH     = os.getenv("DATA_BASE_PATH",     "/app/data/datasets")


# ---------------------------------------------------------------------------
# Model Registry
# ---------------------------------------------------------------------------

#restituisce una lista di dizionari, uno per ogni modello registrato
def load_models() -> List[dict]:
    """Load model definitions from models.yaml registry."""
   
    if not os.path.exists(MODELS_CONFIG_PATH):
        return []
    try:
        with open(MODELS_CONFIG_PATH, "r", encoding="utf-8") as f:
            if _YAML_AVAILABLE:
                config = yaml.safe_load(f) or {} #leggo e carico il file YAML e se è vuoto restituisco un dizionario vuoto
            else:
                config = json.load(f)#provo a leggere il file in json in quanto sottoinsieme di YAML
        return config.get("models", [])#leggo le chiavi models dal dizionario
    except Exception:
        return [] #ritorna lista vuota in caso di errore


def get_model(model_id: str) -> Optional[dict]:
    """Return a specific model definition by ID (case-insensitive)."""
    for m in load_models():
        if m.get("id", "").lower() == model_id.lower():
            return m
    return None


def get_model_result_files(model_id: str, dataset_id: str) -> dict:
    """Return the {method_key: csv_filename} mapping for a model/dataset pair."""
    model = get_model(model_id)
    if not model:
        return {}
    return model.get("results", {}).get(dataset_id.lower(), {})#naviga la struttura annidata model["results"]["bbq"]


# ---------------------------------------------------------------------------
# Dataset Auto-Discovery
# ---------------------------------------------------------------------------
#evito di avere un file datasets.yaml esplorando l'ambiente
def discover_datasets() -> List[dict]:
    # Questa funzione implementa un pattern di auto-discovery:
    # invece di configurare manualmente ogni dataset, il sistema
    # li trova da solo esplorando il filesystem. Basta aggiungere
    # una cartella con metadata.json per registrare un nuovo dataset.
    datasets = []
    if not os.path.exists(DATA_BASE_PATH):
        return datasets
    for name in sorted(os.listdir(DATA_BASE_PATH)):
        folder = os.path.join(DATA_BASE_PATH, name)#costruzione percorso completo
        if not os.path.isdir(folder):#se l'elemento trovato non è una cartella viene ignorato
            continue
        meta_path = os.path.join(folder, "metadata.json")#senza metadata.json il dataset non è riconosciuto
        if not os.path.exists(meta_path):
            continue
        # Secondo criterio: deve esserci almeno un file dati (.arrow o .jsonl).
        # .arrow = formato binario columnar Apache Arrow (usato da StereoSet)
        # .jsonl = JSON Lines, un JSON per riga (usato da BBQ)
        # any() è efficiente: si ferma al primo file trovato (short-circuit).
        has_data = any(
            fname.endswith(".arrow") or fname.endswith(".jsonl")
            for fname in os.listdir(folder)
        )
        if not has_data:#ignoro la cartella se vuota
            continue

        #la cartella ha superato i controlli, quidni registro il dataset
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
             # Unisce l'ID (nome cartella) con tutto il contenuto di metadata.json
            # usando il dict unpacking (**meta).
            # Es: {"id": "bbq", "name": "Bias Benchmark for QA", "format": "jsonl", ...}
                meta = json.load(f)
            datasets.append({"id": name, **meta})#aggiungo nel dizionario tutte le coppie chiave-valore del json e vi aggiungo l'id
        except Exception:
            datasets.append({"id": name})# Se metadata.json è corrotto, registra il dataset con solo l'ID.
    return datasets
