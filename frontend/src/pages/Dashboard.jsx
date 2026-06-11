import { useState, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import Particles, { initParticlesEngine } from "@tsparticles/react";//libreria per le animazioni
import { loadSlim } from "@tsparticles/slim";
import { getCategories, getQuestions, getModels, getDatasets, getModelAnalytics } from '../services/api';
import { useBookmarks } from '../context/BookmarkContext';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();//hook per cambiare pagina
    const { findBookmark, addBookmark, removeBookmark } = useBookmarks();//destrutturazione delle funzioni del contesto

    const [init, setInit] = useState(false);//stato per l'animazione

    // Registry data (fetched from API)
    const [models, setModels]     = useState([]);//lista dei modelli
    const [datasets, setDatasets] = useState([]);//lista dei datasets

    // Selezioni correnti 
    const [model, setModel]     = useState('');
    const [dataset, setDataset] = useState('');
    const [category, setCategory] = useState('');

    // Contenuto selezione
    const [categories, setCategories] = useState([]);
    const [questions, setQuestions]   = useState([]);
    const [{ analyticsSummary, statsLoading }, dispatchAnalytics] = useReducer(
        (_, a) => a,
        { analyticsSummary: [], statsLoading: false }
    ); // useReducer gestisce due stati correlati insieme: i dati analytics e il loading
    // (_, a) => a significa che ogni dispatch sostituisce completamente lo stato
    // con il nuovo valore passato — più semplice di gestire due useState separati
    // statsLoading: mostra "Caricamento..." mentre aspetta la risposta
    // analyticsSummary: contiene le metriche da mostrare nella tabella

    // Bootstrap: particles + fetch registry viene eseguito solo una volta
    useEffect(() => {
        let isMounted = true;
        initParticlesEngine(async (engine) => { await loadSlim(engine); })
            .then(() => { if (isMounted) setInit(true); });//inizializzazione motore delle particelle
        //Funzione asincrona che evita errore perchè i servizi ci mettono tempi diversi ad inizializzarsi 
        const fetchRegistry = async (retries = 5, delay = 3000) => {
            for (let i = 0; i < retries; i++) {//ciclo di prova, se fallisce riprova dopo 3 secondi fino a 5 volte
                try {//Promise.all esegue due chiamate contemporaneamente e attende che entrambe finiscano
                    const [mRes, dRes] = await Promise.all([getModels(), getDatasets()]);
                    //aggiornamento stato 
                    if (!isMounted) return;
                    const mList = mRes.data || [];
                    const dList = dRes.data || [];
                    setModels(mList);
                    setDatasets(dList);
                    if (mList.length > 0) setModel(mList[0].id);
                    if (dList.length > 0) setDataset(dList[0].id);
                    return;
                } catch (err) {
                    if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
                }
            }
        };
        fetchRegistry();
        return () => { isMounted = false; };//funzione di cleanup per segnalare che non bisogna aggiornare lo stato dato che il componente non c'è più
    }, []);

    // Ricarica analytics quando cambia il modello selezionato
    useEffect(() => {
        if (!model) return;
        let isMounted = true;
        dispatchAnalytics({ analyticsSummary: [], statsLoading: true });//mostra il loading e svuota i dati precedenti prima di caricarli
        getModelAnalytics(model)
            .then(res => { if (isMounted) dispatchAnalytics({ analyticsSummary: res.data?.summary || [], statsLoading: false }); })
            .catch(() => { if (isMounted) dispatchAnalytics({ analyticsSummary: [], statsLoading: false }); });
        return () => { isMounted = false; };
    }, [model,models]);

    // Ricarica categorie quando cambia il dataset selezionato
    useEffect(() => {
        if (!dataset) return;
        let isMounted = true;
        getCategories(dataset).then(res => {
            if (!isMounted) return;
            const cats = res.data || [];
            setCategories(cats);
            if (cats.length > 0) setCategory(cats[0]);//seleziona la prima categoria disponibile
        }).catch(err => console.error('Errore categorie:', err));
        return () => { isMounted = false; };
    }, [dataset]);

    // Ricarica i promtp quando cambia ogni categoria o dataset
    useEffect(() => {
        if (!category || !dataset) return;
        let isMounted = true;
        getQuestions(dataset, category, 100)//carica fino a 100 prompt per ogni categoria
            .then(res => { if (isMounted) setQuestions(res.data || []); })
            .catch(err => console.error('Errore domande:', err));
        return () => { isMounted = false; };
    }, [category, dataset]);

    //Funzioni di supporto
    const modelObj   = models.find(m => m.id === model)   || {};//trova l'oggetto completo del modello selezionato
    const datasetObj = datasets.find(d => d.id === dataset) || {};//trova l'oggetto dataset selezionato

    const getPromptId = (q, index) => dataset === 'bbq' ? (q.example_id ?? index) : index;

    const getPromptPreview = (q) => {//genera il testo in anteprima del prompt
        if (dataset === 'bbq') return `${q.context || ''} ${q.question || ''}`.trim();
        return q.display_sentence || q.sentence || q.target || 'N/A';
    };

    //questa funzione costruisce il pacchetto da inviare a Spring Boot unendo le variabili di stato e il testo normalizzato
    const handleBookmark = async (q, index, e) => {
        e.stopPropagation();//evita la propagazione del click
        const promptId = getPromptId(q, index);
        const existing = findBookmark(dataset, category, model, promptId);//cerca se il prompt è salvato nei preferiti
        try {
            if (existing) {
                await removeBookmark(existing.id);
            } else {//se non è salvato, provvede a salvarlo con tutti i metadati
                await addBookmark({
                    dataset,
                    modelName: model,
                    category,
                    exampleId: promptId,
                    promptText: getPromptPreview(q),
                    modelResponse: null,
                    methodUsed: 'explore',
                });
            }
        } catch (err) {
            console.error('Errore preferito:', err);
        }
    };

    //passaggio alla pagina Compare
    const handlePromptClick = (q, index) => {
        navigate(`/compare/${dataset}/${model}/${category}/${getPromptId(q, index)}`);
    };

    // Formatta i valori delle metriche per la visualizzazione nella tabella
    const fmtVal = (key, val) => {
        if (typeof val !== 'number') return String(val);
        return key.includes('bias') ? val.toFixed(4) : `${val.toFixed(1)}%`;
    };

    return (
        <div className="dashboard-wrapper">
            <aside className="control-sidebar">{/*sidebar sinistra */}
                <h1 className="sidebar-logo">BiasMit <span className="logo-accent">AI</span></h1>

                <div className="control-group">
                    <label>Modello</label>
                    {/* value={model} rende il select "controllato" — React gestisce il valore */}
                    {/* onChange aggiorna lo stato quando l'utente cambia selezione */}
                    {/* disabled finché i modelli non sono stati caricati */}
                    <select value={model} onChange={(e) => setModel(e.target.value)} disabled={models.length === 0}>
                        {models.length === 0
                            ? <option>Caricamento...</option>
                            : models.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                                // key={m.id} è richiesto da React per identificare gli elementi della lista
                            ))
                        }
                    </select>
                </div>

                <div className="control-group">
                    <label>Dataset</label>
                    <select value={dataset} onChange={(e) => setDataset(e.target.value)} disabled={datasets.length === 0}>
                        {datasets.length === 0
                            ? <option>Caricamento...</option>
                            : datasets.map(d => (
                                <option key={d.id} value={d.id}>{d.title || d.id}</option>
                            // Mostra il titolo se disponibile, altrimenti l'id
                            ))
                        }
                    </select>
                </div>

                <div className="control-group category-select-wrapper">
                    <label>Categoria</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat.toUpperCase().replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className="nav-btn nav-btn-stats"
                    onClick={() => navigate(`/stats/${model}`)}
                    // Naviga alla pagina delle statistiche del modello selezionato
                    disabled={!model}
                    // Disabilitato se nessun modello è selezionato
                >
                    ▲ Stats Modello
                </button>
            </aside>

            <main className="work-area">
                {init && <Particles id="tsparticles" className="particles-bg" options={particlesConfig} />}

                <div className="work-content">
                     {/* Mostra il nome del modello con fallback progressivi */}
                    <h2 className="model-title-main">{modelObj.name || model || '—'}</h2>

                    <header className="info-grid-top">
                        <div className="info-panel">
                            <h4><span className="dot"></span> Architettura</h4>
                             {/* Mostra i dettagli architetturali del modello da models.yaml */}
                            <p>{modelObj.details || modelObj.architecture || '—'}</p>
                        </div>
                        <div className="info-panel">
                            {/* Mostra la descrizione del dataset da metadata.json */}
                            <h4><span className="dot"></span> Dataset: {datasetObj.title || dataset}</h4>
                            <p>{datasetObj.description || '—'}</p>
                        </div>
                    </header>

                    <div className="results-paper">
                        <section className="paper-section">
                            <h3 className="paper-title-orange">Comparazione Metodologie</h3>

                            {statsLoading && (
                                // Mostra il messaggio di loading mentre aspetta i dati analytics
                                <p className="prompts-empty">Caricamento statistiche...</p>
                            )}

                            {!statsLoading && analyticsSummary.length === 0 && (
                                // Mostra messaggio se non ci sono dati dopo il caricamento
                                <p className="prompts-empty">Dati non disponibili per questo modello.</p>
                            )}

                            {!statsLoading && analyticsSummary.length > 0 && (
                                <div className="multi-stats-container">
                                    {analyticsSummary.map((s, i) => (
                                         //Una colonna per ogni metodo (Baseline, CAA, FairSteer)
                                        <div key={i} className="stat-column">
                                            <div className="method-label">
                                                {s.method.toUpperCase()}
                                                {/* Nome del metodo in maiuscolo come intestazione colonna */}
                                            </div>
                                            <div className="stat-table-wrapper">
                                                <table className="dynamic-stat-table">
                                                    <tbody>
                                                        {Object.entries(s)
                                                            .filter(([k]) => k !== 'method' && k !== 'method_key')
                                                            // Esclude i campi meta che non sono metriche da mostrare
                                                            .map(([key, val]) => (
                                                                <tr key={key}>
                                                                    <td className="stat-key">
                                                                        {key.replace(/_/g, ' ')}
                                                                        {/* Sostituisce _ con spazio per leggibilità */}s
                                                                    </td>
                                                                    <td className={`stat-val${key.includes('bias') ? ' orange-bold' : ''}`}>
                                                                        {fmtVal(key, val)}
                                                                        {/* Formatta il valore con la funzione definita sopra */}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        }
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="paper-section">
                            <h3 className="paper-title-orange">Esplora Prompt: {category}</h3>
                            <div className="prompts-scroll-container">
                                {questions.length === 0 && (
                                    <p className="prompts-empty">Seleziona una categoria per visualizzare i prompt.</p>
                                )}
                                {questions.map((q, i) => {
                                    const promptId = getPromptId(q, i);
                                    const preview  = getPromptPreview(q);
                                    const bm = findBookmark(dataset, category, model, promptId);
                                    // Controlla se questo prompt è già nei bookmark
                                    return (
                                        <div
                                            key={i}
                                            className="prompt-card"
                                            onClick={() => handlePromptClick(q, i)}
                                            // Click sulla card porta alla pagina Compare
                                            title="Clicca per confrontare le risposte dei metodi"
                                        >
                                            <div className="prompt-card-id">#{promptId}</div>
                                            {/* Mostra l'ID del prompt */}
                                            <p className="prompt-card-text">{preview}</p>
                                            {/* Mostra l'anteprima del testo del prompt */}
                                            <button
                                                className={`prompt-bookmark-btn ${bm ? 'saved' : ''}`}
                                                // Aggiunge classe 'saved' se già bookmarkato — cambia il colore della stella
                                                onClick={(e) => handleBookmark(q, i, e)}
                                                title={bm ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                                            >
                                                {bm ? '★' : '☆'}
                                                {/* Stella piena se bookmarkato, vuota altrimenti */}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};
// Configurazione dell'effetto particelle nello sfondo
const particlesConfig = {
    particles: {
        color: { value: "#7fdbff" },
        links: { color: "#7fdbff", distance: 150, enable: true, opacity: 0.1 },
        move: { enable: true, speed: 0.4 },
        number: { value: 100 },
        opacity: { value: 0.2 },
        size: { value: 1 }
    }
};

export default Dashboard;
