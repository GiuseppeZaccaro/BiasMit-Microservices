import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { getCategories, getQuestions, getModels, getDatasets, getModelAnalytics } from '../services/api';
import { useBookmarks } from '../context/BookmarkContext';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const { findBookmark, addBookmark, removeBookmark } = useBookmarks();

    const [init, setInit] = useState(false);

    // Registry data (fetched from API)
    const [models, setModels]     = useState([]);
    const [datasets, setDatasets] = useState([]);

    // Current selections
    const [model, setModel]     = useState('');
    const [dataset, setDataset] = useState('');
    const [category, setCategory] = useState('');

    // Content
    const [categories, setCategories] = useState([]);
    const [questions, setQuestions]   = useState([]);
    const [analyticsSummary, setAnalyticsSummary] = useState([]);
    const [statsLoading, setStatsLoading] = useState(false);

    // Bootstrap: particles + fetch registry
    useEffect(() => {
        initParticlesEngine(async (engine) => { await loadSlim(engine); }).then(() => setInit(true));

        Promise.all([getModels(), getDatasets()])
            .then(([mRes, dRes]) => {
                const mList = mRes.data || [];
                const dList = dRes.data || [];
                setModels(mList);
                setDatasets(dList);
                if (mList.length > 0) setModel(mList[0].id);
                if (dList.length > 0) setDataset(dList[0].id);
            })
            .catch(err => console.error('Errore caricamento registry:', err));
    }, []);

    // Fetch analytics summary when model changes
    useEffect(() => {
        if (!model) return;
        setAnalyticsSummary([]);
        setStatsLoading(true);
        getModelAnalytics(model)
            .then(res => setAnalyticsSummary(res.data?.summary || []))
            .catch(() => setAnalyticsSummary([]))
            .finally(() => setStatsLoading(false));
    }, [model]);

    // Fetch categories when dataset changes
    useEffect(() => {
        if (!dataset) return;
        getCategories(dataset).then(res => {
            const cats = res.data || [];
            setCategories(cats);
            if (cats.length > 0) setCategory(cats[0]);
        }).catch(err => console.error('Errore categorie:', err));
    }, [dataset]);

    // Fetch questions when category or dataset changes
    useEffect(() => {
        if (!category || !dataset) return;
        setQuestions([]);
        getQuestions(dataset, category, 100)
            .then(res => setQuestions(res.data || []))
            .catch(err => console.error('Errore domande:', err));
    }, [category, dataset, model]);

    const modelObj   = models.find(m => m.id === model)   || {};
    const datasetObj = datasets.find(d => d.id === dataset) || {};

    const getPromptId = (q, index) => dataset === 'bbq' ? (q.example_id ?? index) : index;

    const getPromptPreview = (q) => {
        if (dataset === 'bbq') return `${q.context || ''} ${q.question || ''}`.trim();
        return q.display_sentence || q.sentence || q.target || 'N/A';
    };

    const handleBookmark = async (q, index, e) => {
        e.stopPropagation();
        const promptId = getPromptId(q, index);
        const existing = findBookmark(dataset, category, model, promptId);
        try {
            if (existing) {
                await removeBookmark(existing.id);
            } else {
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

    const handlePromptClick = (q, index) => {
        navigate(`/compare/${dataset}/${model}/${category}/${getPromptId(q, index)}`);
    };

    // Format a metric value for display
    const fmtVal = (key, val) => {
        if (typeof val !== 'number') return String(val);
        return key.includes('bias') ? val.toFixed(4) : `${val.toFixed(1)}%`;
    };

    return (
        <div className="dashboard-wrapper">
            <aside className="control-sidebar">
                <h1 className="sidebar-logo">BiasMit <span className="logo-accent">AI</span></h1>

                <div className="control-group">
                    <label>Modello</label>
                    <select value={model} onChange={(e) => setModel(e.target.value)} disabled={models.length === 0}>
                        {models.length === 0
                            ? <option>Caricamento...</option>
                            : models.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
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
                    disabled={!model}
                >
                    ▲ Stats Modello
                </button>
            </aside>

            <main className="work-area">
                {init && <Particles id="tsparticles" className="particles-bg" options={particlesConfig} />}

                <div className="work-content">
                    <h2 className="model-title-main">{modelObj.name || model || '—'}</h2>

                    <header className="info-grid-top">
                        <div className="info-panel">
                            <h4><span className="dot"></span> Architettura</h4>
                            <p>{modelObj.details || modelObj.architecture || '—'}</p>
                        </div>
                        <div className="info-panel">
                            <h4><span className="dot"></span> Dataset: {datasetObj.title || dataset}</h4>
                            <p>{datasetObj.description || '—'}</p>
                        </div>
                    </header>

                    <div className="results-paper">
                        <section className="paper-section">
                            <h3 className="paper-title-orange">Comparazione Metodologie</h3>

                            {statsLoading && (
                                <p className="prompts-empty">Caricamento statistiche...</p>
                            )}

                            {!statsLoading && analyticsSummary.length === 0 && (
                                <p className="prompts-empty">Dati non disponibili per questo modello.</p>
                            )}

                            {!statsLoading && analyticsSummary.length > 0 && (
                                <div className="multi-stats-container">
                                    {analyticsSummary.map((s, i) => (
                                        <div key={i} className="stat-column">
                                            <div className="method-label">
                                                {s.method.toUpperCase()}
                                            </div>
                                            <div className="stat-table-wrapper">
                                                <table className="dynamic-stat-table">
                                                    <tbody>
                                                        {Object.entries(s)
                                                            .filter(([k]) => k !== 'method' && k !== 'method_key')
                                                            .map(([key, val]) => (
                                                                <tr key={key}>
                                                                    <td className="stat-key">
                                                                        {key.replace(/_/g, ' ')}
                                                                    </td>
                                                                    <td className={`stat-val${key.includes('bias') ? ' orange-bold' : ''}`}>
                                                                        {fmtVal(key, val)}
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
                                    return (
                                        <div
                                            key={i}
                                            className="prompt-card"
                                            onClick={() => handlePromptClick(q, i)}
                                            title="Clicca per confrontare le risposte dei metodi"
                                        >
                                            <div className="prompt-card-id">#{promptId}</div>
                                            <p className="prompt-card-text">{preview}</p>
                                            <button
                                                className={`prompt-bookmark-btn ${bm ? 'saved' : ''}`}
                                                onClick={(e) => handleBookmark(q, i, e)}
                                                title={bm ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                                            >
                                                {bm ? '★' : '☆'}
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
