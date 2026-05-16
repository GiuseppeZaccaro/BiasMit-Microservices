from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import uvicorn

from groq import Groq

app = FastAPI(title="BiasMit Interpretation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL   = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class MethodStats(BaseModel):
    model_name: str          # e.g. "mistral"
    method: str              # e.g. "Baseline", "CAA Puntuale", "FairSteer"
    mmlu_acc: float
    stereoset_lms: float
    stereoset_ss: float
    stereoset_icat: float
    bbq_acc: float
    bbq_bias: float


class AnalyzeRequest(BaseModel):
    methods: List[MethodStats]


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_prompt(req: AnalyzeRequest) -> str:
    # Unique models in insertion order
    modelli_unici = list(dict.fromkeys(m.model_name for m in req.methods))
    is_comparative = len(modelli_unici) > 1

    tipo_analisi = (
        "un CONFRONTO CRITICO CROSS-MODELLO tra i diversi LLM selezionati"
        if is_comparative else
        f"un'ANALISI VERTICALE APPROFONDITA sul modello {modelli_unici[0].upper()}"
    )

    # Build data block organized by model
    lines = []
    for model_id in modelli_unici:
        model_methods = [m for m in req.methods if m.model_name == model_id]
        if is_comparative:
            lines.append(f"\n=== Modello: {model_id.upper()} ===")
        else:
            lines.append(f"Modello LLM analizzato: {model_id.upper()}")
        lines.append(f"Metodologie incluse: {', '.join(m.method for m in model_methods)}")
        lines.append("Risultati sperimentali:")
        for m in model_methods:
            lines += [
                f"\n  [{m.method}]",
                f"    MMLU Accuracy:   {m.mmlu_acc:.2f}%   (capacità generali — più alto = meglio)",
                f"    StereoSet LMS:   {m.stereoset_lms:.2f}%  (qualità linguistica — più alto = meglio)",
                f"    StereoSet SS:    {m.stereoset_ss:.2f}%   (bias stereotipante — ideale ~50%)",
                f"    ICAT Score:      {m.stereoset_icat:.2f}/100 (score composito — più alto = meglio)",
                f"    BBQ Accuracy:    {m.bbq_acc:.2f}%  (disambiguazione — più alto = meglio)",
                f"    BBQ Bias Score:  {m.bbq_bias:.4f}   (ideale = 0; negativo = anti-stereotipo)",
            ]

    models_list = ", ".join(m.upper() for m in modelli_unici)

    # Section 3 is cross-model when multiple models are selected, architecture-specific otherwise
    sezione_3 = (
        "**3. IPOTESI SUL PRE-TRAINING E COMPORTAMENTO CROSS-MODELLO**\n"
        f"Analizza le differenze di risposta allo steering tra i modelli ({models_list}) dal punto di vista "
        "dell'architettura e dei dati di pre-training. Quale modello risulta più 'malleabile' e quale più "
        "'rigido' agli impulsi di steering? Cosa suggerisce questa differenza sulla densità dei bias "
        "originariamente assorbiti durante il pre-training? Formula ipotesi sulle possibili differenze "
        "nei dataset di addestramento o nelle scelte architetturali che spieghino questo comportamento."
        if is_comparative else
        "**3. IPOTESI SULL'ARCHITETTURA E SULLA LOCALIZZAZIONE DEL BIAS**\n"
        f"Per il modello {modelli_unici[0].upper()}, formula un'ipotesi sulla localizzazione del bias "
        "nei layer interni. I layer target dello steering (es. layer 16) sono stati una scelta ottimale? "
        "Discuti se il bias in questo modello sembra concentrato in layer specifici (early vs mid vs late) "
        "oppure distribuito diffusamente, basandoti sui pattern di risposta osservati (degrado linguistico, "
        "variazione del bias score). Suggerisci quale range di layer potrebbe essere più efficace."
    )

    return (
        "Agisci come un Senior Research Scientist in AI Alignment ed epistemologia dei Large Language Models.\n\n"
        "Ti vengono forniti i risultati di un esperimento di mitigazione del bias (usando CAA e FairSteer) "
        f"applicato {'a più modelli linguistici' if is_comparative else 'a un modello linguistico'}. "
        "I dati quantitativi completi sono i seguenti:\n\n"
        + "\n".join(lines)
        + "\n\nLINEA GUIDA TASSATIVA: Non ripetere pedissequamente i numeri o le percentuali nel testo "
        "(i dati sono già mostrati in un grafico sopra il tuo output, quindi sarebbe ridondante). "
        "Il tuo obiettivo è fornire un'ANALISI QUALITATIVA E TEORICA APPROFONDITA (circa 500-600 parole). "
        "Devi formulare ipotesi scientifiche e spiegazioni sui meccanismi interni che hanno generato "
        "questi risultati.\n\n"
        "Struttura la risposta in lingua italiana utilizzando esattamente questi titoli in grassetto Markdown:\n\n"
        "**1. MECCANISMI DI MITIGAZIONE ED EFFETTI SULLO SPAZIO DELLE ATTIVAZIONI**\n"
        "Spiega teoricamente perché una metodologia ha funzionato meglio dell'altra su questa specifica "
        "architettura. Cosa sta succedendo nello spazio delle attivazioni latenti? Formula un'ipotesi su "
        "come i vettori di steering di FairSteer o i concetti contrastivi di CAA stiano alterando la "
        "distribuzione di probabilità dei token associati ai bias (genere, socio-economico, ecc.).\n\n"
        "**2. DINAMICHE DI TRADE-OFF E DEGRADAZIONE COGNITIVA (MMLU)**\n"
        "Se noti un crollo o una stabilità dell'accuratezza generale (MMLU), spiega il fenomeno da un "
        "punto di vista teorico. In caso di degrado, discuti il concetto di 'catastrophic forgetting' "
        "locale o di interferenza distruttiva sui circuiti neuronali polisemantici. Se l'MMLU regge, "
        "spiega come lo steering sia riuscito a isolare il bias senza intaccare le capacità ortogonali "
        "di ragionamento del modello.\n\n"
        + sezione_3 + "\n\n"
        "**4. IMPLICAZIONI INGEGNERISTICHE E DIREZIONI DI RICERCA**\n"
        "Fornisci una conclusione speculativa ma scientificamente rigorosa. Sulla base delle dinamiche "
        "osservate, quali strategie suggerisci per ottimizzare ulteriormente l'intervento? Ad esempio, "
        "variare l'intensità dello steering (multiplier), intervenire su layer più precisi "
        "(early vs late layers) o raffinare il dataset di contrasto?\n\n"
        "TONO: Accademico, critico, ipotetico e speculativo. Usa espressioni come "
        "'Questo comportamento suggerisce che...', 'Si può ipotizzare un'interferenza...', "
        "'L'architettura del modello risente di...'. Evita elenchi di dati numerici puri."
    )


# ---------------------------------------------------------------------------
# LLM call
# ---------------------------------------------------------------------------

def call_groq(prompt: str) -> str:
    client = Groq(api_key=LLM_API_KEY)
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1200,
        temperature=0.2,
    )
    return response.choices[0].message.content


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "API Key Groq non configurata. "
                "Imposta la variabile d'ambiente LLM_API_KEY nel file .env."
            ),
        )
    if not req.methods:
        raise HTTPException(status_code=400, detail="Nessun dato fornito per l'analisi.")

    prompt = build_prompt(req)
    try:
        analysis = call_groq(prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Errore chiamata Groq: {str(e)}")

    modelli = list(dict.fromkeys(m.model_name for m in req.methods))
    return {
        "analysis": analysis,
        "model_used": LLM_MODEL,
        "models_analyzed": modelli,
        "methods_analyzed": list(dict.fromkeys(m.method for m in req.methods)),
    }


@app.get("/")
def root():
    return {
        "status": "active",
        "service": "BiasMit Interpretation",
        "llm_configured": bool(LLM_API_KEY),
        "model": LLM_MODEL,
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
