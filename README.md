# BiasMit: Activation Steering Framework for LLM De-biasing

> **A production-grade microservices platform for testing, measuring, and comparing Activation Steering techniques — CAA and FairSteer — on Decoder-Only Transformer models, with the goal of reducing sociolinguistic bias without degrading general language capabilities.**

BiasMit operationalises cutting-edge mechanistic interpretability research into a fully dockerised, observatory-grade system. It computes steering vectors from contrastive activations, injects them at inference time, and evaluates their effect across three independent benchmarks (BBQ, StereoSet, MMLU) — producing both quantitative dashboards and expert AI-generated qualitative analyses via an LLM-as-a-Judge pipeline.

---

## 🚀 Core Features

| Feature | Description |
|---|---|
| **Multi-Model Support** | Plug-and-play model registry via `models.yaml`. Currently ships with **Mistral 7B v0.1** and **Llama 3.1 8B Instruct**. New models are added in minutes — no code changes required. |
| **Advanced Steering** | Two de-biasing methods implemented: **CAA** (Contrastive Activation Addition — static vector injection) and **FairSteer** (dynamic orthogonal projection with calibrated intensity parameter *k*). |
| **Expert AI Analysis** | Results are automatically interpreted by an **LLM-as-a-Judge** module powered by Groq LPU infrastructure (`temperature=0.2`, `max_tokens=1200`), generating structured 4-section academic reports. |
| **Quantitative Benchmarking** | Full dashboard with interactive Recharts visualisations covering **BBQ** (9 demographic categories), **StereoSet** (LMS, SS, ICAT across 4 domains), and **MMLU** (57 academic subjects). |
| **Zero-Retraining Approach** | All interventions are **runtime-only**: model weights are never modified. Steering is applied as a pure forward-pass operation at intermediate layers — reversible, lightweight, and architecture-agnostic. |

---

## 🏗️ System Architecture

BiasMit is composed of **six independent microservices** orchestrated via Docker Compose, communicating exclusively over HTTP/REST on an isolated bridge network.

```
┌──────────────────────────────────────────────────────────────┐
│                 REACT FRONTEND  (Vite · Recharts)            │
│                      Nginx · localhost:5173                  │
└──────────────────────────────┬───────────────────────────────┘
                               │  HTTP / REST
┌──────────────────────────────▼───────────────────────────────┐
│              SPRING BOOT GATEWAY  (Java 17 · JPA)            │
│               PostgreSQL  ·  localhost:8080                  │
└──────────┬────────────────────┬──────────────────┬───────────┘
           │                    │                  │
     ┌─────▼──────┐      ┌──────▼──────┐    ┌─────▼──────────┐
     │ INFERENCE  │      │  ANALYTICS  │    │ INTERPRETATION │
     │  :8000     │      │   :8001     │    │    :8002       │
     │  FastAPI   │      │   FastAPI   │    │   FastAPI      │
     │  Pandas    │      │   Regex     │    │   Groq LPU     │
     │  PyArrow   │      │   Parser    │    │   LLM-as-Judge │
     └─────┬──────┘      └──────┬──────┘    └─────┬──────────┘
           │                    │                  │
┌──────────▼────────────────────▼──────────────────▼───────────┐
│                   DATA LAYER  (Docker Volume)                 │
│   data/datasets/  ·  data/results/  ·  data/stats/           │
│        BBQ (.jsonl)  ·  StereoSet (.arrow)  ·  CSV + TXT     │
└───────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│              POSTGRESQL  (postgres:15)  ·  :5432             │
│                     Bookmark persistence                     │
└──────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Port | Technology | Role |
|---|---|---|---|
| **Frontend** | 5173 | React 18, Vite, Recharts, Nginx | SPA served by Nginx; single entry point for all user interaction |
| **Gateway** | 8080 | Spring Boot 3, Java 17, JPA | Centralised reverse proxy; routes all API calls; manages Bookmark persistence on PostgreSQL |
| **Inference Service** | 8000 | FastAPI, Pandas, PyArrow | Serves raw dataset samples (BBQ, StereoSet, MMLU); reads pre-computed result CSVs |
| **Analytics Service** | 8001 | FastAPI, Python `re` | Parses statistical report `.txt` files; exposes Recharts-ready JSON for all chart endpoints |
| **Interpretation Service** | 8002 | FastAPI, Groq Python SDK | Builds structured prompts from metric deltas; calls Groq API; returns 4-section academic analysis |
| **Database** | 5432 | PostgreSQL 15 | Stores user-saved model comparisons (Bookmarks) via Spring JPA |

### Shared Infrastructure

All Python services mount two shared read-only volumes at startup:

```yaml
volumes:
  - ./shared/config_manager.py:/app/config_manager.py:ro   # Model registry logic
  - ./shared/models.yaml:/app/models.yaml:ro               # Model & result definitions
  - ./data:/app/data                                       # Datasets, results, stats
```

This design ensures **single-source-of-truth configuration**: updating `models.yaml` immediately affects all three Python services without rebuilding any image.

---

## 🧠 Scientific Background

### Activation Steering in Latent Space

Large Language Models encode semantic concepts — including stereotyped associations absorbed from pre-training corpora — as high-dimensional vectors in a latent activation space. Research in mechanistic interpretability has established that this space is **approximately linear for many high-level concepts**: the difference between activations produced by biased and unbiased prompts defines a geometric direction corresponding to the bias.

**Activation Steering** exploits this property to redirect model behaviour at inference time, without retraining. An intervention vector is computed offline from contrastive examples and added to the hidden states at a target intermediate layer *L* during autoregressive generation. Intermediate layers (approximately 30–60% of total network depth) are targeted because they carry the highest density of semantic and relational information.

### Implemented Methods

#### CAA — Contrastive Activation Addition
A **static** steering approach. Given *N* pairs of contrastive prompts (unbiased vs. stereotyped, syntactically equivalent), the mean activation difference at layer *L* defines a permanent steering vector. This vector is added with a scalar coefficient *α* to the hidden state at every generation step — a fixed compass bearing pointing away from bias.

#### FairSteer — Dynamic Fairness Steering
An **adaptive** steering approach. Rather than applying a constant correction, FairSteer measures the projection of the current token's hidden state onto the bias direction and subtracts a fraction *k* of that projection. The correction is therefore proportional to the actual bias present in the specific instance — acting only when and where needed, minimising interference with already-neutral generations.

### Evaluation Benchmarks

| Benchmark | What it measures | Key metrics |
|---|---|---|
| **BBQ** | Social bias in ambiguous QA (9 demographic categories) | `Accuracy (Dis)` ↑, `Bias Score` → 0 |
| **StereoSet** | Stereotyped word associations across 4 bias domains | `LMS` ↑, `SS` → 50%, `ICAT` ↑ |
| **MMLU** | General academic knowledge across 57 subjects | `Accuracy` — target: ΔMMLU ≈ 0 (no regression) |

> **ΔMMLU** is the arbitration metric: a successful de-biasing intervention leaves MMLU unchanged. A significant drop indicates over-aggressive steering and polysemantic circuit interference.

---

## 📦 Installation & Quick Start

### Prerequisites

- **Docker** ≥ 24.0
- **Docker Compose** ≥ 2.20
- A **Groq API key** (free tier sufficient) — obtain at [console.groq.com](https://console.groq.com)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/BiasMit-Microservices-1.git
cd BiasMit-Microservices-1
```

### 2. Configure environment variables

Copy the template and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
# ── Groq LLM (required for AI interpretation) ─────────────────────────────
LLM_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
LLM_MODEL=llama-3.1-8b-instant

# ── PostgreSQL (change in production) ─────────────────────────────────────
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=bias_db
```

### 3. Build and start all services

```bash
docker compose up -d --build
```

Docker Compose will build and start all six containers in dependency order. The full build takes approximately **3–5 minutes** on first run (image layer caching applies on subsequent builds).

### 4. Verify health

```bash
docker compose ps
```

All services should report `running`. Access the application:

| Endpoint | URL |
|---|---|
| **Frontend Dashboard** | http://localhost:5173 |
| **Spring Boot Gateway** | http://localhost:8080 |
| **Inference API (Swagger)** | http://localhost:8000/docs |
| **Analytics API (Swagger)** | http://localhost:8001/docs |
| **Interpretation API (Swagger)** | http://localhost:8002/docs |

### 5. Stop the stack

```bash
docker compose down          # Stop containers (data persisted in volumes)
docker compose down -v       # Stop and delete all volumes (full reset)
```

---

## 🔌 Extensibility

One of BiasMit's core design principles is **model and dataset agnosticism**. Adding a new model or dataset requires no code changes — only configuration and data files.

### Adding a New Model

Append an entry to `shared/models.yaml`:

```yaml
models:
  - id: qwen                                # unique identifier (lowercase)
    name: "Qwen 2.5 7B Instruct"
    architecture: "Dense Transformer"
    details: >
      28 residual layers, Hidden Size 3584. GQA with 4 KV heads.
      SwiGLU activation, RoPE positional encoding.
    steering_type: "categoriale"
    layers: [14]                             # target steering layer(s)
    results:
      bbq:
        baseline:     "qwen/baseline_bbq_full.csv"
        caa_puntuale: "qwen/steered_bbq_L14_puntuale_categoriale.csv"
        fairsteer:    "qwen/risultati_bbq_FairSteer_L14_categoriale.csv"
      stereoset:
        baseline:     "qwen/baseline_stereoset_full.csv"
        caa_puntuale: "qwen/steered_stereoset_L14_puntuale_categoriale.csv"
        fairsteer:    "qwen/risultati_ss_FairSteer_L14_categoriale_k_ss-0.5.csv"
```

Then drop the corresponding CSV files into `data/results/qwen/` and the statistical report files into `data/stats/qwen/`. **No container rebuild required** — all services re-read the config on each request.

### Adding a New Dataset

1. Place dataset files in `data/datasets/<dataset-name>/`
2. Add a `metadata.json` descriptor:

```json
{
  "id": "my-dataset",
  "name": "My Bias Benchmark",
  "description": "...",
  "format": "jsonl",
  "file": "examples.jsonl",
  "categories": ["category_a", "category_b"]
}
```

The Inference Service auto-discovers all datasets with a valid `metadata.json` and exposes them via the `/datasets` endpoint immediately.

### Statistical Reports (Analytics)

The Analytics Service ingests free-text `.txt` report files from `data/stats/<model>/report_<method>.txt`. Reports must conform to the expected format (regex-parsed fields):

```
[MMLU] Accuracy Globale MMLU: 49.28%
[STEREOSET] GLOBALE → LMS: 91.96% | SS: 65.21% | ICAT: 63.99
[BBQ] GLOBALE → Accuracy (Dis): 29.97% | Bias Score (Amb): -0.0027
  - CategoryName | Acc: 28.04% | Bias: -0.009
```

Any method key discovered as `report_<key>.txt` is automatically registered without any configuration.

---

## 📊 Experimental Results (Snapshot)

Results for the two models currently registered in the platform:

### Mistral 7B v0.1 — 32 layers · Hidden size 4096 · Steering @ L16

| Method | BBQ Bias Score | StereoSet SS | ICAT | MMLU Acc |
|---|---|---|---|---|
| Baseline | -0.0027 | 65.21% | 63.99 | 49.28% |
| CAA Puntuale | +0.0018 | 67.18% | 60.44 | 48.29% |
| FairSteer (k=−0.5) | -0.0025 | 65.21% | 63.99 | 49.27% |

### Llama 3.1 8B Instruct — 32 layers · Hidden size 4096 · Steering @ L16

| Method | BBQ Bias Score | StereoSet SS | ICAT | MMLU Acc |
|---|---|---|---|---|
| Baseline | -0.0057 | 62.09% | 69.14 | 63.50% |
| CAA Puntuale | — | — | — | — |
| FairSteer (k=−0.5) | — | — | — | — |

> Full per-category breakdowns are available in the interactive dashboard at `localhost:5173/comparison`.

---

## 🛠️ Technology Stack

| Category | Technology | Version | Role |
|---|---|---|---|
| **Frontend** | React | 18 | Component-based SPA |
| **Frontend** | Vite | 6 | Build tool & dev server |
| **Frontend** | Recharts | 2 | Interactive chart library |
| **Frontend** | React Router | 6 | Client-side navigation |
| **Frontend** | Nginx | 1.25 | Production static file server |
| **Gateway** | Spring Boot | 3 | REST API gateway & orchestration layer |
| **Gateway** | Java | 17 | Runtime |
| **Gateway** | Spring JPA | 3 | ORM for PostgreSQL persistence |
| **Inference** | FastAPI | 0.115 | Async REST API |
| **Inference** | Pandas | 2 | CSV result ingestion |
| **Inference** | PyArrow | 17 | StereoSet `.arrow` binary format |
| **Analytics** | FastAPI | 0.115 | Async REST API |
| **Analytics** | Python `re` | stdlib | Regex-based report parser |
| **Interpretation** | FastAPI | 0.115 | Async REST API |
| **Interpretation** | Groq Python SDK | 0.13 | LPU-accelerated LLM inference |
| **Database** | PostgreSQL | 15 | Bookmark persistence |
| **Infrastructure** | Docker | ≥ 24 | Container runtime |
| **Infrastructure** | Docker Compose | ≥ 2.20 | Multi-service orchestration |
| **Configuration** | PyYAML | 6 | `models.yaml` registry parsing |

---

## 📂 Repository Structure

```
BiasMit-Microservices-1/
│
├── shared/                         # Shared config (volume-mounted across all Python services)
│   ├── models.yaml                 # Model registry — single source of truth
│   └── config_manager.py           # Registry parsing utilities
│
├── data/
│   ├── datasets/                   # Raw benchmark datasets
│   │   ├── bbq/                    # BBQ .jsonl + metadata
│   │   └── stereoset/              # StereoSet .arrow + metadata
│   ├── results/                    # Pre-computed inference results (CSV)
│   │   ├── mistral/
│   │   └── llama/
│   └── stats/                      # Statistical reports (TXT, regex-parseable)
│       ├── mistral/
│       └── llama/
│
├── ai-inference-mock/              # Inference Service (FastAPI · :8000)
├── analytics-service/              # Analytics Service (FastAPI · :8001)
├── ai-interpretation-service/      # Interpretation Service (FastAPI · Groq · :8002)
├── bias-mit-gateway/               # Spring Boot Gateway (:8080)
├── frontend/                       # React SPA (Vite · Nginx · :5173)
│
└── docker-compose.yml              # Full-stack orchestration
```

---

## 🔬 Research Context

BiasMit was developed as part of a Software Engineering Evolution course project. It engineers the operationalisation of recent Activation Steering research — specifically the CAA method introduced by *Steering Language Models with Activation Engineering* (Zou et al., 2023) and the dynamic steering paradigm of FairSteer — into a reproducible, extensible evaluation platform.

The system deliberately simulates inference results (pre-computed CSVs) rather than performing live model inference, enabling full stack demonstration on consumer hardware without GPU requirements. The architecture is designed so that a live inference backend (e.g., vLLM, Ollama, llama.cpp) can be substituted for the mock service with minimal interface changes.

---

## 📄 License

This project is released for academic and educational use. See `LICENSE` for details.

---

<div align="center">
  <sub>Built with precision · Evaluated with rigour · Steered with fairness</sub>
</div>
