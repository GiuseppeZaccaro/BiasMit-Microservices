from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import re
import uvicorn
import config_manager

app = FastAPI(title="BiasMit Analytics Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATS_BASE_PATH = os.getenv("STATS_BASE_PATH", "/app/data/stats")

# Human-readable label hints; unrecognised keys are auto-derived from the key name.
_METHOD_LABEL_HINTS: dict = {
    "baseline":     "Baseline",
    "caa_puntuale": "CAA Puntuale",
    "fairsteer":    "FairSteer",
}


# ---------------------------------------------------------------------------
# Discovery helpers (analytics-specific: based on stats files on disk)
# ---------------------------------------------------------------------------

def method_label(key: str) -> str:
    return _METHOD_LABEL_HINTS.get(key, key.replace("_", " ").title())


def discover_models() -> list:
    """Return model IDs that have a stats subdirectory."""
    if not os.path.exists(STATS_BASE_PATH):
        return []
    return sorted(
        d for d in os.listdir(STATS_BASE_PATH)
        if os.path.isdir(os.path.join(STATS_BASE_PATH, d))
    )


def discover_methods(model: str) -> list:
    """Return method keys discovered as report_*.txt files for the given model."""
    model_dir = os.path.join(STATS_BASE_PATH, model.lower())
    if not os.path.exists(model_dir):
        return []
    keys = []
    for fname in os.listdir(model_dir):
        if fname.startswith("report_") and fname.endswith(".txt"):
            keys.append(fname[len("report_"):-len(".txt")])
    return sorted(keys)


# ---------------------------------------------------------------------------
# Report parsing
# ---------------------------------------------------------------------------

def read_report(model: str, method: str) -> str:
    path = os.path.join(STATS_BASE_PATH, model.lower(), f"report_{method}.txt")
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def to_float(s: str) -> float:
    if not s or s == "N/D":
        return 0.0
    try:
        return float(str(s).strip().rstrip("%"))
    except ValueError:
        return 0.0


def extract(text: str, pattern: str) -> str:
    m = re.search(pattern, text, re.DOTALL)
    return m.group(1).strip() if m else "N/D"


def parse_report(text: str) -> dict:
    if not text:
        return {}

    result = {
        "mmlu_acc":       to_float(extract(text, r"\[MMLU[^\]]*\].*?Accuracy Globale MMLU: ([\d.]+%?)")),
        "stereoset_lms":  to_float(extract(text, r"LMS: ([\d.]+%?)")),
        "stereoset_ss":   to_float(extract(text, r"SS: ([\d.]+%?)")),
        "stereoset_icat": to_float(extract(text, r"ICAT: ([\d.]+)")),
        "bbq_acc":        to_float(extract(text, r"Accuracy \(Dis\): ([\d.]+%?)")),
        "bbq_bias":       to_float(extract(text, r"Bias Score[^:]*:\s*([\d.-]+)")),
    }

    ss_cats: dict = {}
    for m in re.finditer(r"-\s+(\w+)\s+\|\s+LMS:\s+([\d.]+%?)\s+\|\s+SS:\s+([\d.]+%?)", text):
        ss_cats[m.group(1).strip()] = {
            "lms": to_float(m.group(2)),
            "ss":  to_float(m.group(3)),
        }
    result["stereoset_categories"] = ss_cats

    bbq_cats: dict = {}
    for m in re.finditer(r"-\s+([\w]+)\s+\|\s+Acc:\s+([\d.]+%?)\s+\|\s+Bias:\s+([\d.-]+)", text):
        bbq_cats[m.group(1).strip()] = {
            "acc":  to_float(m.group(2)),
            "bias": to_float(m.group(3)),
        }
    result["bbq_categories"] = bbq_cats

    return result


# ---------------------------------------------------------------------------
# Registry endpoints — delegate to shared config_manager
# ---------------------------------------------------------------------------

@app.get("/models")
def get_models():
    """
    List models that have stats on disk, enriched with registry metadata
    from config_manager (name, architecture, etc.).
    """
    model_ids = discover_models()
    result = []
    for mid in model_ids:
        reg = config_manager.get_model(mid)
        if reg:
            result.append({k: v for k, v in reg.items() if k != "results"})
        else:
            result.append({"id": mid, "name": mid.capitalize()})
    return result


@app.get("/datasets")
def get_datasets():
    """List datasets auto-discovered from the data folder (shared config_manager logic)."""
    return config_manager.discover_datasets()


# ---------------------------------------------------------------------------
# Analytics endpoints
# ---------------------------------------------------------------------------

@app.get("/analytics/model/{model_name}")
def get_model_analytics(model_name: str):
    """Structured analytics for all discovered methods of a model — Recharts-ready."""
    methods = discover_methods(model_name)

    empty = {
        "model":              model_name,
        "summary":            [],
        "bbq_accuracy_chart": [],
        "bbq_bias_chart":     [],
        "ss_lms_chart":       [],
        "ss_ss_chart":        [],
    }
    if not methods:
        return empty

    lbl      = {m: method_label(m) for m in methods}
    all_data = {m: parse_report(read_report(model_name, m)) for m in methods}

    summary = [
        {
            "method":         lbl[m],
            "method_key":     m,
            "mmlu_acc":       round(all_data[m].get("mmlu_acc", 0), 2),
            "stereoset_lms":  round(all_data[m].get("stereoset_lms", 0), 2),
            "stereoset_ss":   round(all_data[m].get("stereoset_ss", 0), 2),
            "stereoset_icat": round(all_data[m].get("stereoset_icat", 0), 2),
            "bbq_acc":        round(all_data[m].get("bbq_acc", 0), 2),
            "bbq_bias":       round(all_data[m].get("bbq_bias", 0), 4),
        }
        for m in methods
    ]

    bbq_cats = sorted({c for d in all_data.values() for c in d.get("bbq_categories", {})})
    bbq_accuracy_chart = [
        {"category": cat,
         **{lbl[m]: all_data[m].get("bbq_categories", {}).get(cat, {}).get("acc", 0) for m in methods}}
        for cat in bbq_cats
    ]
    bbq_bias_chart = [
        {"category": cat,
         **{lbl[m]: all_data[m].get("bbq_categories", {}).get(cat, {}).get("bias", 0) for m in methods}}
        for cat in bbq_cats
    ]

    ss_cats = sorted({c for d in all_data.values() for c in d.get("stereoset_categories", {})})
    ss_lms_chart = [
        {"category": cat,
         **{lbl[m]: all_data[m].get("stereoset_categories", {}).get(cat, {}).get("lms", 0) for m in methods}}
        for cat in ss_cats
    ]
    ss_ss_chart = [
        {"category": cat,
         **{lbl[m]: all_data[m].get("stereoset_categories", {}).get(cat, {}).get("ss", 0) for m in methods}}
        for cat in ss_cats
    ]

    return {
        "model":              model_name,
        "summary":            summary,
        "bbq_accuracy_chart": bbq_accuracy_chart,
        "bbq_bias_chart":     bbq_bias_chart,
        "ss_lms_chart":       ss_lms_chart,
        "ss_ss_chart":        ss_ss_chart,
    }


@app.get("/analytics/comparison")
def get_comparison_analytics():
    """
    Multi-model, multi-method comparison.
    Aggregates ALL models discovered in the stats directory.
    Bar keys = method labels for a single model;
               "ModelName — MethodLabel" when multiple models are present.
    """
    all_model_ids = discover_models()
    empty = {
        "models": [], "methods": [],
        "radar_data": [], "metrics_bar": [],
        "bbq_accuracy_chart": [], "bbq_bias_chart": [],
        "ss_lms_chart": [], "ss_ss_chart": [],
    }
    if not all_model_ids:
        return empty

    methods_per_model = {mid: discover_methods(mid) for mid in all_model_ids}
    multi = len(all_model_ids) > 1

    def bar_key(mid: str, m: str) -> str:
        if not multi:
            return method_label(m)
        reg = config_manager.get_model(mid)
        name = reg.get("name", mid.capitalize()) if reg else mid.capitalize()
        return f"{name} — {method_label(m)}"

    all_pairs    = [(mid, m) for mid in all_model_ids for m in methods_per_model.get(mid, [])]
    all_bar_keys = [bar_key(mid, m) for mid, m in all_pairs]

    parsed = {(mid, m): parse_report(read_report(mid, m)) for mid, m in all_pairs}

    # --- per-category breakdown ---
    bbq_cats = sorted({c for d in parsed.values() for c in d.get("bbq_categories", {})})
    ss_cats  = sorted({c for d in parsed.values() for c in d.get("stereoset_categories", {})})

    bbq_accuracy_chart = [
        {"category": cat,
         **{bar_key(mid, m): round(parsed[(mid, m)].get("bbq_categories", {}).get(cat, {}).get("acc", 0), 2)
            for mid, m in all_pairs}}
        for cat in bbq_cats
    ]
    bbq_bias_chart = [
        {"category": cat,
         **{bar_key(mid, m): round(parsed[(mid, m)].get("bbq_categories", {}).get(cat, {}).get("bias", 0), 4)
            for mid, m in all_pairs}}
        for cat in bbq_cats
    ]
    ss_lms_chart = [
        {"category": cat,
         **{bar_key(mid, m): round(parsed[(mid, m)].get("stereoset_categories", {}).get(cat, {}).get("lms", 0), 2)
            for mid, m in all_pairs}}
        for cat in ss_cats
    ]
    ss_ss_chart = [
        {"category": cat,
         **{bar_key(mid, m): round(parsed[(mid, m)].get("stereoset_categories", {}).get(cat, {}).get("ss", 0), 2)
            for mid, m in all_pairs}}
        for cat in ss_cats
    ]

    # --- radar / summary bar ---
    radar_data = [
        {"metric": "BBQ Accuracy",
         **{bar_key(mid, m): round(parsed[(mid, m)].get("bbq_acc", 0), 2)        for mid, m in all_pairs}},
        {"metric": "StereoSet LMS",
         **{bar_key(mid, m): round(parsed[(mid, m)].get("stereoset_lms", 0), 2)  for mid, m in all_pairs}},
        {"metric": "StereoSet SS",
         **{bar_key(mid, m): round(parsed[(mid, m)].get("stereoset_ss", 0), 2)   for mid, m in all_pairs}},
        {"metric": "ICAT Score",
         **{bar_key(mid, m): round(parsed[(mid, m)].get("stereoset_icat", 0), 2) for mid, m in all_pairs}},
        {"metric": "MMLU Accuracy",
         **{bar_key(mid, m): round(parsed[(mid, m)].get("mmlu_acc", 0), 2)       for mid, m in all_pairs}},
    ]

    metrics_bar = [
        {
            "method":        bar_key(mid, m),
            "BBQ Accuracy":  round(parsed[(mid, m)].get("bbq_acc", 0), 2),
            "StereoSet LMS": round(parsed[(mid, m)].get("stereoset_lms", 0), 2),
            "StereoSet SS":  round(parsed[(mid, m)].get("stereoset_ss", 0), 2),
            "ICAT Score":    round(parsed[(mid, m)].get("stereoset_icat", 0), 2),
            "MMLU Accuracy": round(parsed[(mid, m)].get("mmlu_acc", 0), 2),
        }
        for mid, m in all_pairs
    ]

    return {
        "models":              all_model_ids,
        "methods":             all_bar_keys,
        "radar_data":          radar_data,
        "metrics_bar":         metrics_bar,
        "bbq_accuracy_chart":  bbq_accuracy_chart,
        "bbq_bias_chart":      bbq_bias_chart,
        "ss_lms_chart":        ss_lms_chart,
        "ss_ss_chart":         ss_ss_chart,
    }


@app.get("/")
def root():
    return {"status": "active", "service": "BiasMit Analytics"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host=os.getenv("HOST", "0.0.0.0"), port=port)
