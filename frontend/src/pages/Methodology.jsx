import { useState } from 'react';
import './Methodology.css';

const SECTIONS = [

    // ── 1. Spazio Latente & Activation Steering ──────────────────────────────
    {
        id: 'latent',
        icon: '◎',
        color: '#7fdbff',
        title: 'Spazio Latente e Activation Steering',
        subtitle: 'La mappa geometrica del pensiero — come navigare nell\'interiorità del modello',
        content: (
            <>
                <p>
                    Un modello linguistico non "legge" le parole come fa un essere umano.
                    Ogni parola, ogni frase, ogni concetto viene trasformato in un
                    <strong> punto in una mappa geometrica</strong> a migliaia di dimensioni:
                    lo <em>Spazio Latente</em>. In questa mappa, i concetti simili si trovano
                    vicini — "medico" e "infermiere" saranno nello stesso quartiere,
                    "pizza" e "pasta" in un altro. Il modello naviga questa mappa mentre genera
                    il testo, spostandosi da un punto all'altro ad ogni parola prodotta.
                </p>

                <div className="concept-row">
                    <div className="concept-card concept-card-blue">
                        <div className="concept-card-icon">⛰</div>
                        <h4 className="concept-card-title">Le "Valli" del Bias</h4>
                        <p className="concept-card-body">
                            Addestrato su miliardi di testi scritti da esseri umani, il modello
                            ha imparato anche le loro associazioni stereotipate. Nella sua mappa
                            geometrica, queste creano vere e proprie <strong>valli di gravità</strong>:
                            percorsi preferenziali che portano verso risposte parziali, anche senza
                            che il contesto le richieda. Il modello ci "cade dentro" non per
                            intenzione, ma per inerzia statistica.
                        </p>
                    </div>
                    <div className="concept-card concept-card-cyan">
                        <div className="concept-card-icon">🧭</div>
                        <h4 className="concept-card-title">Lo Steering come Navigatore</h4>
                        <p className="concept-card-body">
                            L'<strong>Activation Steering</strong> agisce come un navigatore
                            satellitare per l'interiorità del modello. Invece di riaddestrarlo
                            da zero — un'operazione costosa che richiederebbe settimane di calcolo
                            — modifichiamo <em>al volo</em> la sua rotta geometrica mentre genera
                            il testo: una leggera spinta vettoriale applicata ai layer intermedi,
                            quelli dove la mappa semantica è più ricca e precisa, per allontanarlo
                            dalle valli stereotipate.
                        </p>
                    </div>
                </div>

                <div className="info-box">
                    <span className="info-box-label">Perché i layer intermedi?</span>
                    Nei layer iniziali il transformer elabora sintassi e fonemi. Nei layer finali,
                    costruisce la distribuzione di probabilità sulle parole successive. <strong>È nei
                    layer intermedi</strong> — circa a metà profondità — che risiede la rappresentazione
                    più ricca di concetti, relazioni e, purtroppo, pregiudizi. È lì che interveniamo.
                </div>
            </>
        ),
    },

    // ── 2. CAA vs FairSteer (sezione comparativa) ────────────────────────────
    {
        id: 'methods',
        icon: '⚡',
        color: '#4ade80',
        title: 'Le Due Metodologie a Confronto',
        subtitle: 'CAA e FairSteer — bussola fissa vs timone adattivo',
        content: (
            <>
                <p>
                    Il framework implementa due strategie di de-biasing distinte, entrambe basate
                    sul principio dello spazio latente ma con filosofie operative diverse.
                    La scelta tra le due dipende dal trade-off desiderato tra
                    <strong> semplicità e adattività</strong>.
                </p>

                <div className="compare-grid">
                    {/* ── CAA ── */}
                    <div className="compare-card compare-card-green">
                        <div className="compare-tag compare-tag-green">⊕ CAA</div>
                        <h4 className="compare-headline">La Bussola Fissa</h4>
                        <p className="compare-subline">Contrastive Activation Addition</p>
                        <p className="compare-body">
                            CAA <strong>funziona per contrasto</strong>. Prima della generazione,
                            si raccolgono coppie di esempi opposti — risposte imparziali vs risposte
                            stereotipate — e si calcola la <em>direzione geometrica</em> che le
                            separa nello spazio latente. Questa direzione diventa una bussola
                            permanente: ad ogni passo generativo, viene aggiunta una spinta costante
                            che orienta il modello verso il polo equo e lo allontana dal polo
                            stereotipato.
                        </p>
                        <div className="compare-insight">
                            <span className="compare-insight-label">Metafora</span>
                            Come un veliero che imposta il timone su una rotta fissa:
                            funziona bene nelle condizioni previste, con un comportamento
                            prevedibile e verificabile.
                        </div>
                        <div className="compare-pros-cons">
                            <div className="compare-pro">
                                <span className="compare-pro-dot" />
                                Semplice da calibrare e interpretare
                            </div>
                            <div className="compare-pro">
                                <span className="compare-pro-dot" />
                                Correzione stabile e riproducibile
                            </div>
                            <div className="compare-con">
                                <span className="compare-con-dot" />
                                Stessa intensità anche su frasi già neutrali
                            </div>
                        </div>
                    </div>

                    {/* ── FairSteer ── */}
                    <div className="compare-card compare-card-purple">
                        <div className="compare-tag compare-tag-purple">⚖ FairSteer</div>
                        <h4 className="compare-headline">Il Timone Adattivo</h4>
                        <p className="compare-subline">Dynamic Fairness Steering</p>
                        <p className="compare-body">
                            FairSteer <strong>funziona come uno sterzo dinamico e calibrato</strong>.
                            Ad ogni token generato, rileva <em>quanto</em> l'attivazione corrente
                            stia puntando nella direzione del bias: se la "rotta" è già neutrale,
                            l'intervento è minimo; se il modello sta scivolando verso uno stereotipo,
                            la correzione si intensifica proporzionalmente. Il parametro
                            <strong> k</strong> governa la sensibilità dello sterzo, permettendo
                            di bilanciare riduzione del bias e naturalezza linguistica.
                        </p>
                        <div className="compare-insight">
                            <span className="compare-insight-label">Metafora</span>
                            Come un sistema di guida assistita che corregge solo quando
                            il veicolo esce dalla corsia — intelligente, proporzionale,
                            non invasivo sulle traiettorie già corrette.
                        </div>
                        <div className="compare-pros-cons">
                            <div className="compare-pro">
                                <span className="compare-pro-dot" />
                                Correzione proporzionale all'effettivo bias presente
                            </div>
                            <div className="compare-pro">
                                <span className="compare-pro-dot" />
                                Minore disturbo su generazioni già neutrali
                            </div>
                            <div className="compare-con">
                                <span className="compare-con-dot" />
                                Richiede calibrazione del parametro k
                            </div>
                        </div>
                    </div>
                </div>

                <div className="info-box" style={{ borderColor: '#4ade80', background: 'rgba(74,222,128,0.06)', marginTop: 20 }}>
                    <span className="info-box-label" style={{ color: '#4ade80' }}>In comune tra i due metodi</span>
                    Nessuno dei due metodologia riaddestra o modifica i pesi del modello.
                    L'intervento è <strong>puramente a runtime</strong>, reversibile e applicabile
                    a qualsiasi architettura Decoder-Only Transformer senza costi computazionali
                    di addestramento. La differenza sta solo nel <em>quando</em> e nel
                    <em> quanto</em> si interviene.
                </div>
            </>
        ),
    },

    // ── 3. I Tre Dataset di Validazione ─────────────────────────────────────
    {
        id: 'datasets',
        icon: '◉',
        color: '#FF8C00',
        title: 'I Tre Dataset di Validazione',
        subtitle: 'BBQ · StereoSet · MMLU — tre prospettive sul comportamento del modello',
        content: (
            <>
                <p>
                    Valutare il de-biasing richiede più di un singolo punteggio: serve misurare
                    l'equità delle risposte, la qualità del linguaggio residuo e la tenuta delle
                    capacità cognitive generali. Tre dataset, tre domande distinte.
                </p>

                <div className="dataset-grid">

                    {/* ── BBQ ── */}
                    <div className="dataset-card dataset-card-orange">
                        <div className="dataset-card-header">
                            <span className="dataset-icon">⚖</span>
                            <div>
                                <div className="dataset-name">BBQ</div>
                                <div className="dataset-full">Bias Benchmark for Question Answering</div>
                            </div>
                        </div>
                        <p className="dataset-question">
                            <strong>Domanda che risponde:</strong> Il modello è imparziale
                            davanti a una domanda ambigua?
                        </p>
                        <p className="dataset-body">
                            BBQ mette il modello davanti a scenari volutamente ambigui:
                            <em> "Chi ha rotto il vaso, il ragazzo o l'anziano?"</em> — senza
                            abbastanza informazioni per rispondere. La risposta corretta è
                            "Non si può sapere". Un modello parziale ignorerà questa
                            incertezza e punterà sulla persona che corrisponde allo stereotipo
                            del contesto. BBQ conta quante volte il modello sbaglia proprio
                            in questa direzione.
                        </p>
                        <div className="dataset-metrics">
                            <div className="dataset-metric">
                                <span className="dataset-metric-name" style={{ color: '#06b6d4' }}>Accuracy (Dis)</span>
                                <span className="dataset-metric-desc">% risposte corrette quando il contesto è chiaro. Più alto = meglio.</span>
                            </div>
                            <div className="dataset-metric">
                                <span className="dataset-metric-name" style={{ color: '#ef4444' }}>Bias Score</span>
                                <span className="dataset-metric-desc">Da −1 a +1. L'obiettivo è <strong>0</strong> (nessuna preferenza direzionale). Negativo = anti-stereotipo. Positivo = stereotipante.</span>
                            </div>
                        </div>
                        <div className="dataset-categories">
                            {['Età','Disabilità','Genere','Nazionalità','Aspetto fisico','Razza','Religione','SES','Or. sessuale'].map((c) => (
                                <span key={c} className="cat-chip" style={{ borderColor: '#FF8C00', color: '#c05700' }}>{c}</span>
                            ))}
                        </div>
                    </div>

                    {/* ── StereoSet ── */}
                    <div className="dataset-card dataset-card-red">
                        <div className="dataset-card-header">
                            <span className="dataset-icon">◑</span>
                            <div>
                                <div className="dataset-name">StereoSet</div>
                                <div className="dataset-full">Stereotype Score &amp; Language Modeling</div>
                            </div>
                        </div>
                        <p className="dataset-question">
                            <strong>Domanda che risponde:</strong> Il modello preferisce le
                            associazioni stereotipate? E parla ancora bene?
                        </p>
                        <p className="dataset-body">
                            StereoSet propone completamenti di frasi in tre versioni:
                            stereotipante, anti-stereotipante e assurda. Misura quale versione
                            il modello trova più "naturale" statisticamente. È un test a
                            due facce: l'ideale non è solo rifiutare lo stereotipo, ma farlo
                            mantenendo intatta la fluidità grammaticale e logica del linguaggio.
                        </p>
                        <div className="dataset-metrics">
                            <div className="dataset-metric">
                                <span className="dataset-metric-name" style={{ color: '#4ade80' }}>LMS — Naturalezza</span>
                                <span className="dataset-metric-desc">% frasi sensate preferite alle assurde. Misura che lo steering non abbia reso il modello ripetitivo o sgrammaticato. Più alto = meglio.</span>
                            </div>
                            <div className="dataset-metric">
                                <span className="dataset-metric-name" style={{ color: '#FF8C00' }}>SS — Pregiudizio</span>
                                <span className="dataset-metric-desc">% preferenza per il completamento stereotipato. L'obiettivo è <strong>50%</strong> — neutralità perfetta tra stereotipo e anti-stereotipo.</span>
                            </div>
                            <div className="dataset-metric">
                                <span className="dataset-metric-name" style={{ color: '#a78bfa' }}>ICAT — Score composito</span>
                                <span className="dataset-metric-desc">Combina LMS e SS in un unico punteggio che penalizza sia il bias che il degrado linguistico. Più alto = meglio.</span>
                            </div>
                        </div>
                    </div>

                    {/* ── MMLU ── */}
                    <div className="dataset-card dataset-card-blue">
                        <div className="dataset-card-header">
                            <span className="dataset-icon">⬛</span>
                            <div>
                                <div className="dataset-name">MMLU</div>
                                <div className="dataset-full">Massive Multitask Language Understanding</div>
                            </div>
                        </div>
                        <p className="dataset-question">
                            <strong>Domanda che risponde:</strong> L'intervento ha danneggiato
                            l'intelligenza generale del modello?
                        </p>
                        <p className="dataset-body">
                            MMLU è il <em>test della patente</em>: 57 discipline accademiche —
                            matematica, storia, medicina, diritto, fisica — per verificare
                            che lo steering non abbia reso il modello meno capace o
                            logicamente più debole. Se il punteggio MMLU scende drasticamente
                            dopo il de-biasing, significa che la correzione era troppo aggressiva
                            e ha compromesso il ragionamento generale.
                        </p>
                        <div className="dataset-metrics">
                            <div className="dataset-metric">
                                <span className="dataset-metric-name" style={{ color: '#60a5fa' }}>Accuracy globale</span>
                                <span className="dataset-metric-desc">% risposte corrette su 57 materie. L'obiettivo è mantenere questo valore <strong>invariato</strong> rispetto al baseline — ΔMMLU ≈ 0.</span>
                            </div>
                        </div>
                        <div className="info-box" style={{ marginTop: 14, borderColor: '#3b82f6', background: 'rgba(59,130,246,0.06)' }}>
                            <span className="info-box-label" style={{ color: '#60a5fa' }}>Il test del trade-off</span>
                            MMLU è l'arbitro finale: un de-biasing riuscito mantiene MMLU
                            stabile. Un de-biasing eccessivo lo abbassa. Il framework misura
                            questo delta per ogni metodologia e ne quantifica il costo cognitivo.
                        </div>
                    </div>

                </div>
            </>
        ),
    },

    // ── 4. LLM-as-a-Judge ────────────────────────────────────────────────────
    {
        id: 'llm-judge',
        icon: '◈',
        color: '#f59e0b',
        title: 'Modulo di Valutazione Qualitativa',
        subtitle: 'AI Observability — LLM-as-a-Judge per l\'analisi critica dei risultati',
        content: (
            <>
                <p>
                    BiasMit integra un livello di <strong>AI Observability</strong> che trasforma
                    le metriche quantitative grezze in interpretazioni critiche e contestualizzate.
                    Un microservizio dedicato — <strong>ai-interpretation-service</strong> — implementa
                    il paradigma <strong>LLM-as-a-Judge</strong>: un LLM autonomo agisce da revisore
                    peer, valutando in tempo reale l'efficacia delle metodologie di de-biasing con
                    rigore comparabile a quello di un esperto di AI Safety.
                </p>

                <div className="llm-badges-row">
                    <span className="llm-badge llm-badge-amber">LLM · Alta Capacità</span>
                    <span className="llm-badge llm-badge-cyan">Groq LPU</span>
                    <span className="llm-badge llm-badge-orange">FastAPI · :8002</span>
                    <span className="llm-badge llm-badge-purple">LLM-as-a-Judge</span>
                </div>

                <div className="llm-detail-grid">
                    <div className="llm-detail-card">
                        <div className="llm-detail-title">Configurazione di Ragionamento</div>
                        <p>Il modello di analisi opera con <code>temperature=0.2</code> per massimizzare
                        la riproducibilità dell'output e <code>max_tokens=1200</code> per report
                        approfonditi da 500–600 parole. La bassa temperatura elimina la variabilità
                        casuale nell'interpretazione dei dati sperimentali.</p>
                    </div>
                    <div className="llm-detail-card">
                        <div className="llm-detail-title">Infrastruttura Groq LPU</div>
                        <p>Le richieste vengono processate su <em>Language Processing Units</em> (LPU)
                        di Groq — architettura dataflow specializzata nell'inferenza di LLM che
                        garantisce latenze sub-secondo, superiori a quelle delle GPU tradizionali.</p>
                    </div>
                    <div className="llm-detail-card">
                        <div className="llm-detail-title">Struttura del Report Generato</div>
                        <p>Il servizio produce un report strutturato in 4 sezioni: <strong>(1)</strong>
                        Analisi quantitativa del de-biasing; <strong>(2)</strong> Valutazione del degrado
                        delle capacità generali; <strong>(3)</strong> Diagnosi del trade-off (Pareto
                        Efficiency); <strong>(4)</strong> Raccomandazione architetturale e strategica.</p>
                    </div>
                    <div className="llm-detail-card">
                        <div className="llm-detail-title">Dati in Ingresso</div>
                        <p>Il servizio riceve i delta aggregati tra Baseline e metodologie steered:
                        BBQ Bias Score, StereoSet SS, MMLU Accuracy, LMS e ICAT Score. Ogni metrica è
                        annotata con la propria semantica interpretativa nel system prompt.</p>
                    </div>
                </div>

                <div className="info-box" style={{ borderColor: '#f59e0b', background: 'rgba(245,158,11,0.06)' }}>
                    <span className="info-box-label" style={{ color: '#f59e0b' }}>Vincolo tassativo del prompt</span>
                    Ogni paragrafo del report generato deve contenere almeno un riferimento numerico
                    esplicito ai dati sperimentali. Questo vincolo, codificato nel system prompt,
                    elimina le analisi generiche e garantisce un output verificabile e riproducibile.
                </div>
            </>
        ),
    },

    // ── 5. Architettura del Sistema — INVARIATA ──────────────────────────────
    {
        id: 'architecture',
        icon: '⬡',
        color: '#94a3b8',
        title: 'Architettura del Sistema',
        subtitle: 'Microservizi comunicanti via HTTP/REST — orchestrazione Docker Compose',
        content: (
            <>
                <p>
                    BiasMit è strutturato come un sistema di <strong>microservizi indipendenti</strong>
                    orchestrati tramite Docker Compose. Ogni componente ha una responsabilità ben
                    definita e comunica via HTTP/REST. L'architettura è progettata per essere
                    <strong> agnostica al modello</strong>: qualsiasi LLM compatibile con l'interfaccia
                    di inferenza può essere sostituito senza modificare gli altri servizi.
                </p>
                <div className="arch-diagram">
                    <div className="arch-row">
                        <div className="arch-node arch-frontend">
                            <div className="arch-node-title">Frontend</div>
                            <div className="arch-node-sub">React + Vite · Nginx · :5173</div>
                        </div>
                    </div>
                    <div className="arch-arrow">↓ HTTP/REST</div>
                    <div className="arch-row">
                        <div className="arch-node arch-gateway">
                            <div className="arch-node-title">Spring Boot Gateway</div>
                            <div className="arch-node-sub">Java 17 · JPA · PostgreSQL · :8080</div>
                        </div>
                    </div>
                    <div className="arch-arrows-three">
                        <div className="arch-arrow-label">↙ Inference</div>
                        <div className="arch-arrow-label">↓ Analytics</div>
                        <div className="arch-arrow-label">Interpretation ↘</div>
                    </div>
                    <div className="arch-row arch-row-three">
                        <div className="arch-node arch-python">
                            <div className="arch-node-title">Inference Service</div>
                            <div className="arch-node-sub">FastAPI · PyArrow · Pandas · :8000</div>
                        </div>
                        <div className="arch-node arch-analytics">
                            <div className="arch-node-title">Analytics Service</div>
                            <div className="arch-node-sub">FastAPI · Regex parser · :8001</div>
                        </div>
                        <div className="arch-node arch-interp">
                            <div className="arch-node-title">Interpretation Service</div>
                            <div className="arch-node-sub">FastAPI · Groq LPU · LLM Judge · :8002</div>
                        </div>
                    </div>
                    <div className="arch-arrow">↓ Volume mount</div>
                    <div className="arch-row">
                        <div className="arch-node arch-data">
                            <div className="arch-node-title">Data Layer</div>
                            <div className="arch-node-sub">BBQ (.jsonl) · StereoSet (.arrow) · Results (.csv) · Stats (.txt)</div>
                        </div>
                    </div>
                </div>
                <div className="arch-legend">
                    <div className="legend-row"><span className="legend-dot" style={{ background: '#7fdbff' }} />Frontend: SPA React servita da Nginx, comunica solo con il Gateway</div>
                    <div className="legend-row"><span className="legend-dot" style={{ background: '#4ade80' }} />Gateway: proxy verso i microservizi Python, gestisce Bookmark su PostgreSQL</div>
                    <div className="legend-row"><span className="legend-dot" style={{ background: '#FF8C00' }} />Inference: serve dataset, calcola confronti tra metodologie di de-biasing</div>
                    <div className="legend-row"><span className="legend-dot" style={{ background: '#a78bfa' }} />Analytics: legge i report .txt e produce dati chart-ready per i grafici</div>
                    <div className="legend-row"><span className="legend-dot" style={{ background: '#f59e0b' }} />Interpretation: LLM-as-a-Judge via Groq, genera analisi accademica in 4 sezioni</div>
                </div>
            </>
        ),
    },
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

const Methodology = () => {
    const [open, setOpen] = useState(() =>
        Object.fromEntries(SECTIONS.map(s => [s.id, true]))
    );

    const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="method-wrapper">
            <header className="method-page-header">
                <h1 className="method-page-title">
                    Metodologia <span className="accent">del Framework</span>
                </h1>
                <p className="method-page-sub">
                    Spazio latente, activation steering e validazione quantitativa —
                    come BiasMit interviene sul comportamento dei modelli linguistici
                </p>
            </header>

            <div className="method-content">
                {SECTIONS.map(({ id, icon, color, title, subtitle, content }) => (
                    <div key={id} className="method-card" style={{ '--card-color': color }}>
                        <button
                            className="method-card-header"
                            onClick={() => toggle(id)}
                            aria-expanded={open[id]}
                        >
                            <div className="method-card-header-left">
                                <span className="card-icon" style={{ color }}>{icon}</span>
                                <div>
                                    <h2 className="card-title">{title}</h2>
                                    <p className="card-subtitle">{subtitle}</p>
                                </div>
                            </div>
                            <span className={`card-chevron ${open[id] ? 'open' : ''}`}>▾</span>
                        </button>
                        {open[id] && (
                            <div className="method-card-body">
                                {content}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Methodology;
