# BiasMit: Framework di Activation Steering per il De-biasing degli LLM

> **Una piattaforma a microservizi production-grade per testare, misurare e confrontare tecniche di Activation Steering — CAA e FairSteer — su modelli Transformer Decoder-Only, con l'obiettivo di ridurre i bias sociolinguistici senza degradare le capacità linguistiche generali.**

BiasMit trasforma la ricerca all'avanguardia sull'interpretabilità meccanicistica in un sistema completamente dockerizzato di livello osservatorio. Calcola vettori di steering a partire da attivazioni contrastive, li inietta durante l'inferenza e ne valuta l'effetto su tre benchmark indipendenti (BBQ, StereoSet, MMLU) — producendo sia dashboard quantitativi che analisi qualitative generate da un'IA esperta tramite una pipeline LLM-as-a-Judge.

---

## 🚀 Funzionalità Principali

| Funzionalità | Descrizione |
|---|---|
| **Supporto Multi-Modello** | Registro modelli plug-and-play tramite `models.yaml`. Attualmente include **Mistral 7B v0.1** e **Llama 3.1 8B Instruct**. Nuovi modelli vengono aggiunti in pochi minuti — senza modifiche al codice. |
| **Steering Avanzato** | Due metodi di de-biasing implementati: **CAA** (Contrastive Activation Addition — iniezione di vettore statico) e **FairSteer** (proiezione ortogonale dinamica con parametro di intensità calibrato *k*). |
| **Analisi IA Esperta** | I risultati vengono interpretati automaticamente da un modulo **LLM-as-a-Judge** alimentato dall'infrastruttura Groq LPU (`temperature=0.2`, `max_tokens=1200`), che genera report accademici strutturati in 4 sezioni. |
| **Benchmarking Quantitativo** | Dashboard completo con visualizzazioni interattive Recharts che coprono **BBQ** (9 categorie demografiche), **StereoSet** (LMS, SS, ICAT su 4 domini) e **MMLU** (57 materie accademiche). |
| **Approccio Zero-Retraining** | Tutti gli interventi sono **solo a runtime**: i pesi del modello non vengono mai modificati. Lo steering è applicato come pura operazione di forward-pass a livelli intermedi — reversibile, leggero e agnostico all'architettura. |

---

## 🏗️ Architettura del Sistema

BiasMit è composto da **sei microservizi indipendenti** orchestrati tramite Docker Compose, che comunicano esclusivamente via HTTP/REST su una rete bridge isolata.

```
┌──────────────────────────────────────────────────────────────┐
│              FRONTEND REACT  (Vite · Recharts)               │
│                    Nginx · localhost:5173                    │
└──────────────────────────────┬───────────────────────────────┘
                               │  HTTP / REST
┌──────────────────────────────▼───────────────────────────────┐
│            GATEWAY SPRING BOOT  (Java 17 · JPA)              │
│               PostgreSQL  ·  localhost:8080                  │
└──────────┬────────────────────┬──────────────────┬───────────┘
           │                    │                  │
     ┌─────▼──────┐      ┌──────▼──────┐    ┌─────▼──────────┐
     │ INFERENZA  │      │  ANALYTICS  │    │ INTERPRETAZIONE│
     │  :8000     │      │   :8001     │    │    :8002       │
     │  FastAPI   │      │   FastAPI   │    │   FastAPI      │
     │  Pandas    │      │   Regex     │    │   Groq LPU     │
     │  PyArrow   │      │   Parser    │    │  LLM-as-Judge  │
     └─────┬──────┘      └──────┬──────┘    └─────┬──────────┘
           │                    │                  │
┌──────────▼────────────────────▼──────────────────▼───────────┐
│                  LIVELLO DATI  (Volume Docker)                │
│   data/datasets/  ·  data/results/  ·  data/stats/           │
│        BBQ (.jsonl)  ·  StereoSet (.arrow)  ·  CSV + TXT     │
└───────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│              POSTGRESQL  (postgres:15)  ·  :5432             │
│                   Persistenza Bookmark                       │
└──────────────────────────────────────────────────────────────┘
```

### Responsabilità dei Servizi

| Servizio | Porta | Tecnologia | Ruolo |
|---|---|---|---|
| **Frontend** | 5173 | React 18, Vite, Recharts, Nginx | SPA servita da Nginx; unico punto d'accesso per tutte le interazioni utente |
| **Gateway** | 8080 | Spring Boot 3, Java 17, JPA | Reverse proxy centralizzato; instrada tutte le chiamate API; gestisce la persistenza dei Bookmark su PostgreSQL |
| **Servizio Inferenza** | 8000 | FastAPI, Pandas, PyArrow | Fornisce campioni grezzi dei dataset (BBQ, StereoSet, MMLU); legge i CSV dei risultati pre-calcolati |
| **Servizio Analytics** | 8001 | FastAPI, Python `re` | Analizza i file di report statistici `.txt`; espone JSON Recharts-ready per tutti gli endpoint dei grafici |
| **Servizio Interpretazione** | 8002 | FastAPI, Groq Python SDK | Costruisce prompt strutturati dai delta delle metriche; chiama le API Groq; restituisce analisi accademica in 4 sezioni |
| **Database** | 5432 | PostgreSQL 15 | Memorizza i confronti tra modelli salvati dall'utente (Bookmark) tramite Spring JPA |

### Infrastruttura Condivisa

Tutti i servizi Python montano due volumi condivisi in sola lettura all'avvio:

```yaml
volumes:
  - ./shared/config_manager.py:/app/config_manager.py:ro   # Logica del registro modelli
  - ./shared/models.yaml:/app/models.yaml:ro               # Definizioni modelli e risultati
  - ./data:/app/data                                       # Dataset, risultati, statistiche
```

Questo design garantisce una **configurazione con unica fonte di verità**: aggiornare `models.yaml` ha effetto immediato su tutti e tre i servizi Python senza ricostruire nessuna immagine.

---

## 🧠 Contesto Scientifico

### Activation Steering nello Spazio Latente

I Large Language Model codificano concetti semantici — incluse le associazioni stereotipate assorbite dai corpus di pre-training — come vettori ad alta dimensionalità in uno spazio di attivazione latente. La ricerca sull'interpretabilità meccanicistica ha stabilito che questo spazio è **approssimativamente lineare per molti concetti di alto livello**: la differenza tra le attivazioni prodotte da prompt biased e unbiased definisce una direzione geometrica corrispondente al bias.

L'**Activation Steering** sfrutta questa proprietà per riorientare il comportamento del modello durante l'inferenza, senza riaddestrarlo. Un vettore di intervento viene calcolato offline a partire da esempi contrastivi e aggiunto agli stati nascosti a un livello intermedio target *L* durante la generazione autoregressiva. I livelli intermedi (circa 30–60% della profondità totale della rete) sono scelti perché portano la maggiore densità di informazioni semantiche e relazionali.

### Metodi Implementati

#### CAA — Contrastive Activation Addition

Un approccio di steering **statico**. Dati *N* coppie di prompt contrastivi (unbiased vs. stereotipato, sintatticamente equivalenti), la differenza media delle attivazioni al livello *L* definisce un vettore di steering permanente. Questo vettore viene aggiunto con un coefficiente scalare *α* allo stato nascosto ad ogni passo di generazione — una bussola fissa che punta lontano dal bias.

#### FairSteer — Steering Dinamico per la Fairness

Un approccio di steering **adattivo**. Invece di applicare una correzione costante, FairSteer misura la proiezione dello stato nascosto del token corrente sulla direzione di bias e ne sottrae una frazione *k*. La correzione è quindi proporzionale al bias effettivamente presente nell'istanza specifica — agisce solo quando e dove necessario, minimizzando le interferenze con le generazioni già neutrali.

### Benchmark di Valutazione

| Benchmark | Cosa misura | Metriche chiave |
|---|---|---|
| **BBQ** | Bias sociale in QA ambigui (9 categorie demografiche) | `Accuracy (Dis)` ↑, `Bias Score` → 0 |
| **StereoSet** | Associazioni di parole stereotipate in 4 domini di bias | `LMS` ↑, `SS` → 50%, `ICAT` ↑ |
| **MMLU** | Conoscenza accademica generale in 57 materie | `Accuracy` — obiettivo: ΔMMLU ≈ 0 (nessuna regressione) |

> **ΔMMLU** è la metrica arbitrale: un intervento di de-biasing riuscito lascia l'MMLU invariato. Un calo significativo indica uno steering troppo aggressivo e interferenza con i circuiti polisemantici.

---

## 📦 Installazione e Avvio Rapido

### Prerequisiti

- **Docker** ≥ 24.0
- **Docker Compose** ≥ 2.20
- Una **chiave API Groq** (il piano gratuito è sufficiente) — ottenibile su [console.groq.com](https://console.groq.com)

### 1. Clona il repository

```bash
git clone https://github.com/<tuo-username>/BiasMit-Microservices-1.git
cd BiasMit-Microservices-1
```

### 2. Configura le variabili d'ambiente

Copia il template e inserisci le tue credenziali:

```bash
cp .env.example .env
```

Modifica `.env`:

```dotenv
# ── Groq LLM (necessario per l'interpretazione IA) ────────────────────────
LLM_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
LLM_MODEL=llama-3.1-8b-instant

# ── PostgreSQL (modificare in produzione) ─────────────────────────────────
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=bias_db
```

### 3. Costruisci e avvia tutti i servizi

```bash
docker compose up -d --build
```

Docker Compose costruirà e avvierà tutti e sei i container nell'ordine corretto di dipendenza. La prima build richiede circa **3–5 minuti** (il caching dei layer si applica alle build successive).

### 4. Verifica lo stato

```bash
docker compose ps
```

Tutti i servizi dovrebbero risultare `running`. Accedi all'applicazione:

| Endpoint | URL |
|---|---|
| **Dashboard Frontend** | http://localhost:5173 |
| **Gateway Spring Boot** | http://localhost:8080 |
| **API Inferenza (Swagger)** | http://localhost:8000/docs |
| **API Analytics (Swagger)** | http://localhost:8001/docs |
| **API Interpretazione (Swagger)** | http://localhost:8002/docs |

### 5. Ferma lo stack

```bash
docker compose down          # Ferma i container (dati persistiti nei volumi)
docker compose down -v       # Ferma ed elimina tutti i volumi (reset completo)
```

---

## 🔌 Estensibilità

Uno dei principi cardine di BiasMit è l'**agnosticismo rispetto a modelli e dataset**. Aggiungere un nuovo modello o dataset non richiede modifiche al codice — solo file di configurazione e dati.

### Aggiungere un Nuovo Modello

Aggiungi una voce a `shared/models.yaml`:

```yaml
models:
  - id: qwen                                # identificatore univoco (minuscolo)
    name: "Qwen 2.5 7B Instruct"
    architecture: "Dense Transformer"
    details: >
      28 livelli residuali, Hidden Size 3584. GQA con 4 KV heads.
      Attivazione SwiGLU, codifica posizionale RoPE.
    steering_type: "categoriale"
    layers: [14]                             # livello/i di steering target
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

Poi copia i CSV corrispondenti in `data/results/qwen/` e i file di report statistici in `data/stats/qwen/`. **Non è necessario ricostruire i container** — tutti i servizi rileggono la configurazione ad ogni richiesta.

### Aggiungere un Nuovo Dataset

1. Inserisci i file del dataset in `data/datasets/<nome-dataset>/`
2. Aggiungi un descrittore `metadata.json`:

```json
{
  "id": "mio-dataset",
  "name": "Il Mio Benchmark di Bias",
  "description": "...",
  "format": "jsonl",
  "file": "esempi.jsonl",
  "categories": ["categoria_a", "categoria_b"]
}
```

Il Servizio di Inferenza rileva automaticamente tutti i dataset con un `metadata.json` valido e li espone immediatamente tramite l'endpoint `/datasets`.

### Report Statistici (Analytics)

Il Servizio Analytics legge file di report in testo libero `.txt` da `data/stats/<modello>/report_<metodo>.txt`. I report devono rispettare il formato atteso (campi analizzati tramite regex):

```
[MMLU] Accuracy Globale MMLU: 49.28%
[STEREOSET] GLOBALE → LMS: 91.96% | SS: 65.21% | ICAT: 63.99
[BBQ] GLOBALE → Accuracy (Dis): 29.97% | Bias Score (Amb): -0.0027
  - NomeCategoria | Acc: 28.04% | Bias: -0.009
```

Qualsiasi chiave di metodo trovata come `report_<chiave>.txt` viene registrata automaticamente senza alcuna configurazione aggiuntiva.

---

## 📊 Risultati Sperimentali (Snapshot)

Risultati per i due modelli attualmente registrati nella piattaforma:

### Mistral 7B v0.1 — 32 livelli · Hidden size 4096 · Steering @ L16

| Metodo | BBQ Bias Score | StereoSet SS | ICAT | MMLU Acc |
|---|---|---|---|---|
| Baseline | -0.0027 | 65.21% | 63.99 | 49.28% |
| CAA Puntuale | +0.0018 | 67.18% | 60.44 | 48.29% |
| FairSteer (k=−0.5) | -0.0025 | 65.21% | 63.99 | 49.27% |

### Llama 3.1 8B Instruct — 32 livelli · Hidden size 4096 · Steering @ L16

| Metodo | BBQ Bias Score | StereoSet SS | ICAT | MMLU Acc |
|---|---|---|---|---|
| Baseline | -0.0057 | 62.09% | 69.14 | 63.50% |
| CAA Puntuale | — | — | — | — |
| FairSteer (k=−0.5) | — | — | — | — |

> I dettagli per categoria sono disponibili nel dashboard interattivo su `localhost:5173/comparison`.

---

## 🛠️ Stack Tecnologico

| Categoria | Tecnologia | Versione | Ruolo |
|---|---|---|---|
| **Frontend** | React | 18 | SPA basata su componenti |
| **Frontend** | Vite | 6 | Build tool e server di sviluppo |
| **Frontend** | Recharts | 2 | Libreria per grafici interattivi |
| **Frontend** | React Router | 6 | Navigazione lato client |
| **Frontend** | Nginx | 1.25 | Server di file statici in produzione |
| **Gateway** | Spring Boot | 3 | Gateway REST API e livello di orchestrazione |
| **Gateway** | Java | 17 | Runtime |
| **Gateway** | Spring JPA | 3 | ORM per la persistenza su PostgreSQL |
| **Inferenza** | FastAPI | 0.115 | API REST asincrona |
| **Inferenza** | Pandas | 2 | Ingestione dei risultati CSV |
| **Inferenza** | PyArrow | 17 | Formato binario `.arrow` di StereoSet |
| **Analytics** | FastAPI | 0.115 | API REST asincrona |
| **Analytics** | Python `re` | stdlib | Parser di report basato su regex |
| **Interpretazione** | FastAPI | 0.115 | API REST asincrona |
| **Interpretazione** | Groq Python SDK | 0.13 | Inferenza LLM accelerata da LPU |
| **Database** | PostgreSQL | 15 | Persistenza dei Bookmark |
| **Infrastruttura** | Docker | ≥ 24 | Runtime per container |
| **Infrastruttura** | Docker Compose | ≥ 2.20 | Orchestrazione multi-servizio |
| **Configurazione** | PyYAML | 6 | Parsing del registro `models.yaml` |

---

## 📂 Struttura del Repository

```
BiasMit-Microservices-1/
│
├── shared/                         # Configurazione condivisa (montata in tutti i servizi Python)
│   ├── models.yaml                 # Registro modelli — unica fonte di verità
│   └── config_manager.py           # Utilità per il parsing del registro
│
├── data/
│   ├── datasets/                   # Dataset benchmark grezzi
│   │   ├── bbq/                    # BBQ .jsonl + metadata
│   │   └── stereoset/              # StereoSet .arrow + metadata
│   ├── results/                    # Risultati di inferenza pre-calcolati (CSV)
│   │   ├── mistral/
│   │   └── llama/
│   └── stats/                      # Report statistici (TXT, analizzabili via regex)
│       ├── mistral/
│       └── llama/
│
├── ai-inference-mock/              # Servizio Inferenza (FastAPI · :8000)
├── analytics-service/              # Servizio Analytics (FastAPI · :8001)
├── ai-interpretation-service/      # Servizio Interpretazione (FastAPI · Groq · :8002)
├── bias-mit-gateway/               # Gateway Spring Boot (:8080)
├── frontend/                       # SPA React (Vite · Nginx · :5173)
│
└── docker-compose.yml              # Orchestrazione dell'intero stack
```

---

## 🔬 Contesto della Ricerca

BiasMit è stato sviluppato nell'ambito di un progetto per il corso di Evoluzione del Software. Ingegnerizza l'operazionalizzazione della ricerca recente sull'Activation Steering — in particolare il metodo CAA introdotto da *Steering Language Models with Activation Engineering* (Zou et al., 2023) e il paradigma di steering dinamico di FairSteer — in una piattaforma di valutazione riproducibile ed estensibile.

Il sistema simula deliberatamente i risultati di inferenza (tramite CSV pre-calcolati) invece di eseguire inferenza live sui modelli, consentendo la dimostrazione dell'intero stack su hardware consumer senza requisiti GPU. L'architettura è progettata in modo che un backend di inferenza live (es. vLLM, Ollama, llama.cpp) possa sostituire il servizio mock con modifiche minime all'interfaccia.
