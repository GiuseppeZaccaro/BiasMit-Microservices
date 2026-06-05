# BiasMit: Framework di Activation Steering per il De-biasing degli LLM

Piattaforma a microservizi dockerizzata per testare, misurare e confrontare tecniche di Activation Steering — **CAA** e **FairSteer** — su modelli Transformer Decoder-Only, con l'obiettivo di ridurre i bias sociolinguistici senza degradare le capacità linguistiche generali.

`Microservizi` · `Docker` · `React` · `Spring Boot` · `FastAPI` · `PostgreSQL`

---

## Indice ReadMe

1. [Visione del Progetto e Metodologia](#1-visione-del-progetto-e-metodologia)
2. [Contesto Scientifico](#2-contesto-scientifico)
3. [Pilastri Tecnici del Progetto](#3-pilastri-tecnici-del-progetto)
4. [Matrice di Valutazione](#4-matrice-di-valutazione)
5. [Architettura del Sistema](#5-architettura-del-sistema)
6. [Stack Tecnologico](#6-stack-tecnologico)
7. [Funzionalità del Sistema](#7-funzionalità-del-sistema)
8. [Estensibilità](#8-estensibilità)
9. [Guida all'Installazione](#9-guida-allinstallazione)
10. [Note di Deploy e Troubleshooting](#10-note-di-deploy-e-troubleshooting)
11. [Riferimenti e Contesto della Ricerca](#11-riferimenti-e-contesto-della-ricerca)

---

## 1. Visione del Progetto e Metodologia

BiasMit nasce per rendere operativa la ricerca sull'interpretabilità meccanicistica degli LLM, trasformandola da esperimento di laboratorio in un sistema completo, riproducibile e facilmente ispezionabile. Lo scopo è confrontare l'effetto delle tecniche di steering sui benchmark e presentare i risultati sia in forma quantitativa (dashboard) sia in forma qualitativa (analisi generata da un'IA esperta).

> **Nota fondamentale — Inferenza simulata.** BiasMit **non esegue inferenza degli LLM a runtime** e non elabora i modelli al momento della richiesta. I risultati di steering, baseline e benchmark sono **pre-calcolati** e distribuiti come file CSV. La piattaforma legge, aggrega e visualizza questi risultati: nessun modello viene caricato o interrogato durante l'uso del sistema. Questa scelta consente di dimostrare l'intero stack su hardware consumer senza GPU. L'architettura è comunque predisposta affinché un backend di inferenza live (es. vLLM, Ollama, llama.cpp) possa sostituire il servizio mock con modifiche minime all'interfaccia.

Lo sviluppo segue due principi guida:

- **Architettura a microservizi dockerizzati**: ogni responsabilità (frontend, orchestrazione, lettura dei risultati, analytics, interpretazione, persistenza) vive in un container isolato. Questo garantisce separazione delle responsabilità, coerenza tra ambienti e facilità di deploy.
- **Zero-Retraining come oggetto di studio**: le tecniche analizzate non modificano mai i pesi del modello (lo steering agisce, in linea di principio, come operazione di forward-pass a livelli intermedi). BiasMit non applica questo intervento dal vivo, ma ne **valuta gli esiti** a partire dai risultati pre-calcolati.

---

## 2. Contesto Scientifico

Questa sezione descrive le basi teoriche delle tecniche valutate. Si tratta del quadro concettuale di riferimento: in BiasMit gli esiti di queste tecniche sono pre-calcolati offline, non eseguiti dalla piattaforma.

### Activation Steering nello Spazio Latente

I Large Language Model codificano i concetti semantici — incluse le associazioni stereotipate assorbite durante il pre-training — come vettori in uno spazio di attivazione ad alta dimensionalità. Per molti concetti di alto livello questo spazio è **approssimativamente lineare**: la differenza tra le attivazioni prodotte da prompt *biased* e *unbiased* individua una direzione geometrica che corrisponde al bias.

L'**Activation Steering** sfrutta questa proprietà per riorientare il comportamento del modello durante l'inferenza, senza riaddestrarlo. Un vettore di intervento viene calcolato a partire da esempi contrastivi e applicato agli stati nascosti di un livello intermedio target *L*. I livelli intermedi (circa il 30–60% della profondità della rete) sono scelti perché concentrano la maggiore densità di informazione semantica.

### Metodi Implementati

| Metodo | Tipo | Idea di base |
|---|---|---|
| **CAA** (Contrastive Activation Addition) | Statico | La differenza media delle attivazioni tra coppie contrastive definisce un vettore fisso, aggiunto allo stato nascosto ad ogni passo con un coefficiente *α* — una "bussola" costante che punta lontano dal bias. |
| **FairSteer** | Dinamico | Misura quanto lo stato nascosto del token corrente proietta sulla direzione di bias e ne sottrae una frazione *k*. La correzione è proporzionale al bias effettivamente presente: agisce solo quando serve, riducendo le interferenze sulle generazioni già neutrali. |

---

## 3. Pilastri Tecnici del Progetto

I principi che caratterizzano l'ingegneria di BiasMit:

**3.1 Inferenza Simulata (No Runtime Processing)**
BiasMit non esegue inferenza degli LLM durante l'uso e non elabora dati a runtime. Tutti i risultati provengono da CSV pre-calcolati offline: la piattaforma si limita a leggerli, aggregarli e visualizzarli. Questo mantiene il sistema leggero e dimostrabile senza GPU.

**3.2 Zero-Retraining (tecnica studiata)**
Le tecniche di steering analizzate non modificano mai i pesi del modello: agiscono come operazione di forward-pass a livelli intermedi, reversibile e a basso costo. BiasMit ne valuta gli esiti, senza applicarle dal vivo.

**3.3 Configurazione a Unica Fonte di Verità**
Modelli e risultati sono descritti in un unico file (`models.yaml`), montato in sola lettura su tutti i servizi Python. Aggiornarlo ha effetto immediato sull'intero sistema, senza ricostruire alcuna immagine.

**3.4 Agnosticismo verso Modelli e Dataset**
Aggiungere un nuovo modello o un nuovo dataset non richiede modifiche al codice, ma solo file di configurazione e dati. Il sistema rileva automaticamente le nuove voci.

**3.5 Analisi IA Esperta (LLM-as-a-Judge)**
I risultati numerici vengono interpretati automaticamente da un modulo basato su Groq, che genera un report accademico strutturato a partire dai delta delle metriche.

**3.6 Disaccoppiamento dei Servizi**
I sei microservizi comunicano esclusivamente via HTTP/REST su una rete bridge isolata, così che ogni componente possa evolvere o essere sostituito in modo indipendente.

---

## 4. Matrice di Valutazione

BiasMit misura l'effetto dello steering su tre benchmark indipendenti, scelti per coprire dimensioni complementari: bias sociale, associazioni stereotipate e conservazione delle capacità generali.

| Benchmark | Cosa misura | Metriche chiave |
|---|---|---|
| **BBQ** | Bias sociale in domande ambigue (9 categorie demografiche) | `Accuracy (Dis)` ↑ · `Bias Score` → 0 |
| **StereoSet** | Associazioni di parole stereotipate (4 domini) | `LMS` ↑ · `SS` → 50% · `ICAT` ↑ |
| **MMLU** | Conoscenza accademica generale (57 materie) | `Accuracy` — obiettivo: ΔMMLU ≈ 0 |

> **ΔMMLU è la metrica arbitrale.** Un de-biasing riuscito lascia l'MMLU sostanzialmente invariato. Un calo significativo segnala uno steering troppo aggressivo, che interferisce con le capacità linguistiche del modello.

---

## 5. Architettura del Sistema

BiasMit è composto da **sei microservizi indipendenti** orchestrati tramite Docker Compose.

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
     └─────┬──────┘      └──────┬──────┘    └─────┬──────────┘
           │                    │                  │
┌──────────▼────────────────────▼──────────────────▼───────────┐
│                  LIVELLO DATI  (Volume Docker)                │
│   data/datasets/  ·  data/results/  ·  data/stats/           │
└───────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│              POSTGRESQL  (postgres:15)  ·  :5432             │
└──────────────────────────────────────────────────────────────┘
```

| Servizio | Porta | Ruolo |
|---|---|---|
| **Frontend** | 5173 | SPA React servita da Nginx; unico punto d'accesso utente |
| **Gateway** | 8080 | Instrada tutte le chiamate API; gestisce la persistenza dei Bookmark |
| **Inferenza (mock)** | 8000 | Espone i campioni dei dataset e i CSV dei risultati pre-calcolati; **non esegue inferenza live** |
| **Analytics** | 8001 | Analizza i report statistici ed espone JSON pronti per i grafici |
| **Interpretazione** | 8002 | Genera l'analisi accademica via Groq (LLM-as-a-Judge) |
| **Database** | 5432 | Memorizza i confronti tra modelli salvati dall'utente |

> Tutti i servizi Python montano in sola lettura `models.yaml` e la cartella `data/`: un'unica fonte di verità condivisa, senza necessità di ricostruire le immagini quando la configurazione cambia.

---

## 6. Stack Tecnologico

| Ambito | Tecnologia | Ruolo |
|---|---|---|
| **Frontend** | React 18, Vite 6, Recharts 2, React Router 6, Nginx | SPA, grafici interattivi, serving statico |
| **Gateway** | Spring Boot 3, Java 17, Spring JPA | Orchestrazione API e persistenza |
| **Servizi Python** | FastAPI 0.115, Pandas, PyArrow, Groq SDK | Lettura risultati pre-calcolati, analytics, interpretazione IA |
| **Database** | PostgreSQL 15 | Persistenza dei Bookmark |
| **Infrastruttura** | Docker ≥ 24, Docker Compose ≥ 2.20 | Containerizzazione e orchestrazione |
| **Configurazione** | PyYAML 6 | Parsing del registro `models.yaml` |

---

## 7. Funzionalità del Sistema

| Funzionalità | Descrizione |
|---|---|
| **Supporto Multi-Modello** | Registro plug-and-play tramite `models.yaml`. Attualmente include **Mistral 7B v0.1** e **Llama 3.1 8B Instruct**. e **Qwen 3.5 9B incstruct**|
| **Steering Avanzato** | Due metodi di de-biasing: **CAA** (vettore statico) e **FairSteer** (proiezione dinamica con intensità calibrata *k*). |
| **Analisi IA Esperta** | Un modulo **LLM-as-a-Judge** alimentato da Groq interpreta i risultati e produce un report accademico strutturato. |
| **Benchmarking Quantitativo** | Dashboard interattivo con visualizzazioni Recharts su BBQ, StereoSet e MMLU. |
| **Risultati Pre-calcolati** | Gli esiti di steering e benchmark sono simulati offline e serviti via CSV; nessuna inferenza degli LLM avviene a runtime. |
| **Zero-Retraining (tecnica)** | Le tecniche valutate non modificano mai i pesi del modello: lo steering agisce, in teoria, come operazione di forward-pass. |
| **Bookmark dei Confronti** | L'utente può salvare i confronti tra modelli e metodi, persistiti su PostgreSQL. |

---

## 8. Estensibilità

Uno dei principi cardine di BiasMit è l'**agnosticismo rispetto a modelli e dataset**: per estenderlo bastano file di configurazione e dati, senza toccare il codice.

**Aggiungere un nuovo modello** — si inserisce una voce in `shared/models.yaml` (id, nome, architettura, livello di steering, percorsi dei CSV dei risultati) e si copiano i file corrispondenti in `data/results/` e `data/stats/`. Nessuna ricostruzione dei container è necessaria.

**Aggiungere un nuovo dataset** — si inseriscono i file in `data/datasets/<nome>/` con un descrittore `metadata.json`. Il Servizio di Inferenza rileva automaticamente ogni dataset con metadata valido e lo espone tramite l'endpoint `/datasets`.

**Report statistici** — il Servizio Analytics legge file `.txt` da `data/stats/<modello>/report_<metodo>.txt`. Ogni nuova chiave di metodo viene registrata automaticamente.

> **Nota:** su Linux i nomi dei file `.jsonl` del dataset BBQ devono essere in **lowercase** per essere trovati correttamente.

---

## 9. Guida all'Installazione

**Prerequisiti:** Docker ≥ 24, Docker Compose ≥ 2.20, una chiave API Groq (il piano gratuito è sufficiente).

### 9.1 Avvio Locale

```bash
# 1. Clona il repository
git clone https://github.com/<tuo-username>/BiasMit-Microservices.git
cd BiasMit-Microservices

# 2. Crea il file .env nella root
#    LLM_API_KEY=gsk_xxxxxxxx
#    LLM_MODEL=llama-3.1-8b-instant
#    POSTGRES_USER=user / POSTGRES_PASSWORD=password / POSTGRES_DB=bias_db
#    VITE_API_BASE_URL=   (lasciare vuoto in locale)

# 3. Costruisci e avvia tutti i servizi
docker compose up -d --build

# 4. Verifica lo stato
docker compose ps
```

La prima build richiede circa 3–5 minuti. Endpoint principali:

| Servizio | URL |
|---|---|
| Dashboard Frontend | http://localhost:5173 |
| Gateway | http://localhost:8080 |
| API Inferenza (Swagger) | http://localhost:8000/docs |
| API Analytics (Swagger) | http://localhost:8001/docs |
| API Interpretazione (Swagger) | http://localhost:8002/docs |

Per fermare lo stack: `docker compose down` (oppure `down -v` per reset completo dei volumi).

### 9.2 Deploy in Produzione (Google Cloud)

Testato su VM **e2-standard-2**, Ubuntu 22.04, con le porte **5173** e **8080** aperte nel firewall GCP.

```bash
git clone https://github.com/<tuo-username>/BiasMit-Microservices.git
cd BiasMit-Microservices

# Configura il .env di produzione impostando:
#   VITE_API_BASE_URL=http://<IP_PUBBLICO_VM>:8080/api/gateway

sudo docker compose up -d --build
```

Accesso: `http://<IP_PUBBLICO_VM>:5173`.

Per aggiornare il codice dopo un push:

```bash
git pull
sudo docker compose build --no-cache frontend   # solo se modificato il frontend
sudo docker compose up -d
```

> Consigliato promuovere l'IP della VM a **statico** dalla console GCP (VPC Network → Indirizzi IP esterni) per evitare che cambi ad ogni riavvio.

---

## 10. Note di Deploy e Troubleshooting

| Situazione | Causa | Soluzione |
|---|---|---|
| Dataset BBQ non trovato | Linux è case-sensitive; i file `.jsonl` hanno nomi con maiuscole | Rinominare i file in lowercase (es. `age.jsonl`, non `Age.jsonl`) |
| Frontend non contatta il gateway in produzione | `VITE_API_BASE_URL` punta a `localhost` o è vuoto | Impostare l'IP pubblico della VM e ricostruire il frontend con `--no-cache` (la variabile è iniettata a build-time da Vite) |
| Dashboard vuota al primo accesso | Il gateway Spring Boot impiega ~15s ad avviarsi | Nessun intervento: il frontend ritenta automaticamente fino a 5 volte a intervalli di 3s |
| Dati assenti dopo l'avvio | I file in `data/` non sono presenti sull'host | I dati sono montati come volumi, non inclusi nelle immagini: vanno copiati sulla macchina host prima dell'avvio |

---

## 11. Riferimenti e Contesto della Ricerca

BiasMit è stato sviluppato per il corso di **Evoluzione del Software** e operazionalizza la ricerca recente sull'Activation Steering in una piattaforma di valutazione riproducibile ed estensibile. In particolare fa riferimento a:

- **CAA — Contrastive Activation Addition**, introdotto in *Steering Language Models with Activation Engineering* (Zou et al., 2023).
- **FairSteer**, paradigma di steering dinamico per la fairness.

Coerentemente con la sua natura dimostrativa, il sistema **non esegue inferenza degli LLM a runtime**: gli esiti sono pre-calcolati offline e serviti tramite CSV, così da poter dimostrare l'intero stack su hardware consumer senza requisiti GPU. L'architettura resta comunque pronta a integrare un backend di inferenza live al posto del servizio mock.
