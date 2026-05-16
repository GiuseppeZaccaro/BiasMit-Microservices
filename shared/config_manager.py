"""
Shared configuration module — Python 3.9 compatible.
Loaded by ai-inference-service and ai-analytics-service via Docker volume mount.
"""
import os
import json
from typing import List, Optional

try:
    import yaml
    _YAML_AVAILABLE = True
except ImportError:
    _YAML_AVAILABLE = False

MODELS_CONFIG_PATH = os.getenv("MODELS_CONFIG_PATH", "/app/models.yaml")
DATA_BASE_PATH     = os.getenv("DATA_BASE_PATH",     "/app/data/datasets")


# ---------------------------------------------------------------------------
# Model Registry
# ---------------------------------------------------------------------------

def load_models() -> List[dict]:
    """Load model definitions from models.yaml registry."""
    if not os.path.exists(MODELS_CONFIG_PATH):
        return []
    try:
        with open(MODELS_CONFIG_PATH, "r", encoding="utf-8") as f:
            if _YAML_AVAILABLE:
                config = yaml.safe_load(f) or {}
            else:
                config = json.load(f)
        return config.get("models", [])
    except Exception:
        return []


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
    return model.get("results", {}).get(dataset_id.lower(), {})


# ---------------------------------------------------------------------------
# Dataset Auto-Discovery
# ---------------------------------------------------------------------------

def discover_datasets() -> List[dict]:
    """
    Scan DATA_BASE_PATH for subdirectories that contain:
      - a metadata.json file
      - at least one .arrow or .jsonl data file
    Returns a list of dataset dicts with their metadata merged in.
    """
    datasets = []
    if not os.path.exists(DATA_BASE_PATH):
        return datasets
    for name in sorted(os.listdir(DATA_BASE_PATH)):
        folder = os.path.join(DATA_BASE_PATH, name)
        if not os.path.isdir(folder):
            continue
        meta_path = os.path.join(folder, "metadata.json")
        if not os.path.exists(meta_path):
            continue
        has_data = any(
            fname.endswith(".arrow") or fname.endswith(".jsonl")
            for fname in os.listdir(folder)
        )
        if not has_data:
            continue
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            datasets.append({"id": name, **meta})
        except Exception:
            datasets.append({"id": name})
    return datasets
