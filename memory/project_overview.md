---
name: project-overview
description: Architettura BiasMit-Microservices-1 — scopo, microservizi, linguaggi, dati
metadata:
  type: project
---

Progetto di ricerca sulla mitigazione del bias nei modelli LLM (attualmente Mistral). Architettura a microservizi orchestrata con Docker Compose.

**Microservizi:**
- `ai-inference-service` (Python/FastAPI, porta 8000) — legge dataset e risultati CSV/Arrow da `./data`, espone API REST per BBQ e StereoSet
- `gateway` (Java/Spring Boot 3.2.5, porta 8080) — proxy/gateway verso il servizio Python; gestisce bookmark su PostgreSQL (JPA + Lombok)
- `db` (PostgreSQL 15, porta 5432) — database per i bookmark del gateway
- `frontend` (React/Vite, non containerizzato) — SPA con React Router, Axios, Lucide-React; pagine Home e Dashboard

**Dataset e risultati:**
- `data/datasets/bbq/` — 9 categorie di bias (Age, Gender, Race, ecc.) in formato JSONL
- `data/datasets/stereoset/` — file Arrow (intrasentence, intersentence)
- `data/results/mistral/` — CSV con output di 4 metodi: baseline, CAA puntuale, CAA block, FairSteer
- `data/stats/mistral/` — report .txt di metriche aggregate per metodo

**Metodi di de-bias confrontati:** baseline, caa_puntuale, caa_block, fairsteer

**Why:** progetto per corso "Evoluzione del Software"
**How to apply:** tenere a mente la natura accademica/di ricerca; i dati sono locali, il modello LLM non gira nel container (solo i risultati pre-calcolati).
