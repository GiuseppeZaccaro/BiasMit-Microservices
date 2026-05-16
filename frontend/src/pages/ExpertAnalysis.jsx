import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { getModels, getModelAnalytics, analyzeWithLLM } from '../services/api';
import './ExpertAnalysis.css';

const METRIC_COLORS = {
    'BBQ Accuracy':  '#0284c7',
    'StereoSet LMS': '#16a34a',
    'StereoSet SS':  '#ea580c',
    'ICAT Score':    '#7c3aed',
    'MMLU Accuracy': '#dc2626',
};

const MODEL_PALETTE = ['#7c3aed', '#0284c7', '#ea580c', '#16a34a', '#dc2626'];
const modelColor = (index) => MODEL_PALETTE[index % MODEL_PALETTE.length];

const tooltipStyle = {
    contentStyle: { background: '#0a1628', border: '1px solid #1e3a5f', color: '#e2e8f0' },
    formatter: (v) => [typeof v === 'number' ? `${v.toFixed(2)}%` : v],
};

const ExpertAnalysis = () => {
    const navigate = useNavigate();
    const [models, setModels]             = useState([]);
    const [selectedModels, setSelectedModels] = useState([]);
    const [analyticsMap, setAnalyticsMap] = useState({});
    const [loadingModels, setLoadingModels] = useState({});
    const [analysis, setAnalysis]         = useState('');
    const [analyzing, setAnalyzing]       = useState(false);
    const [apiError, setApiError]         = useState('');
    const fetchedRef = useRef(new Set());

    const fetchModelAnalytics = useCallback((modelId) => {
        if (fetchedRef.current.has(modelId)) return;
        fetchedRef.current.add(modelId);
        setLoadingModels(prev => ({ ...prev, [modelId]: true }));
        getModelAnalytics(modelId)
            .then(res => setAnalyticsMap(prev => ({ ...prev, [modelId]: res.data })))
            .catch(() => {
                fetchedRef.current.delete(modelId);
                setApiError(`Impossibile caricare i dati per ${modelId}.`);
            })
            .finally(() => setLoadingModels(prev => ({ ...prev, [modelId]: false })));
    }, []);

    // Load model list once; pre-select and pre-fetch first model
    useEffect(() => {
        getModels()
            .then(res => {
                const list = res.data || [];
                setModels(list);
                if (list.length > 0) {
                    const firstId = list[0].id;
                    setSelectedModels([firstId]);
                    fetchModelAnalytics(firstId);
                }
            })
            .catch(() => setApiError('Impossibile caricare i modelli.'));
    }, [fetchModelAnalytics]);

    const toggleModel = (modelId) => {
        setSelectedModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId]
        );
        fetchModelAnalytics(modelId);
        setAnalysis('');
        setApiError('');
    };

    const handleAnalyze = () => {
        const allMethods = [];
        for (const modelId of selectedModels) {
            const data = analyticsMap[modelId];
            if (!data) continue;
            for (const row of (data.summary || [])) {
                allMethods.push({ model_name: modelId, ...row });
            }
        }
        if (allMethods.length === 0) return;

        setAnalyzing(true);
        setAnalysis('');
        setApiError('');
        analyzeWithLLM({ methods: allMethods })
            .then(res => setAnalysis(res.data.analysis || ''))
            .catch(err => {
                const detail = err.response?.data?.detail || err.response?.data;
                setApiError(typeof detail === 'string'
                    ? detail
                    : "Errore durante l'analisi. Verifica che LLM_API_KEY sia configurata nel .env");
            })
            .finally(() => setAnalyzing(false));
    };

    const isMultiModel  = selectedModels.length > 1;
    const isLoadingAny  = selectedModels.some(id => loadingModels[id]);
    const canAnalyze    = selectedModels.length > 0
        && !isLoadingAny
        && !analyzing
        && selectedModels.every(id => analyticsMap[id]);

    // Build chart rows: for each selected model, expand metrics_bar rows with label prefix when multi-model
    const chartData = selectedModels.flatMap(modelId => {
        const data = analyticsMap[modelId];
        if (!data) return [];
        const modelName = models.find(m => m.id === modelId)?.name || modelId.toUpperCase();
        return (data.metrics_bar || []).map(row => ({
            ...row,
            method: isMultiModel ? `${modelName} — ${row.method}` : row.method,
        }));
    });

    const renderAnalysis = (text) => {
        return text.split('\n').map((line, i) => {
            if (!line.trim()) return <div key={i} className="analysis-spacer" />;
            const boldLine = line.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
            if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                return (
                    <li key={i} className="analysis-bullet"
                        dangerouslySetInnerHTML={{ __html: boldLine.replace(/^[\s\-•]+/, '') }} />
                );
            }
            return <p key={i} className="analysis-para" dangerouslySetInnerHTML={{ __html: boldLine }} />;
        });
    };

    const btnLabel = analyzing
        ? <><span className="btn-spinner" /> Analisi in corso...</>
        : isMultiModel ? 'Confronta Modelli con LLM' : 'Analizza con LLM';

    return (
        <div className="expert-wrapper">
            <header className="expert-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
                <div>
                    <h1 className="expert-title">
                        Analisi <span className="accent">Esperto</span>
                    </h1>
                    <p className="expert-subtitle">
                        {isMultiModel
                            ? 'Confronto cross-modello · tutte le metodologie · analisi critica via LLM (Groq)'
                            : 'Analisi verticale del modello · tutte le metodologie · interpretazione via LLM (Groq)'}
                    </p>
                </div>
            </header>

            <div className="expert-content">

                {/* ── 1. Model selection ── */}
                <section className="expert-section">
                    <h2 className="section-title">Configurazione Analisi</h2>
                    <p className="section-desc">
                        Seleziona uno o più modelli. Per ogni modello vengono incluse automaticamente
                        tutte le metodologie disponibili (Baseline, CAA Puntuale, FairSteer).
                    </p>

                    <div className="controls-row">
                        <div className="control-group">
                            <label className="control-label">Modelli da analizzare</label>
                            <div className="method-checkboxes">
                                {models.map((m, i) => (
                                    <label key={m.id} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={selectedModels.includes(m.id)}
                                            onChange={() => toggleModel(m.id)}
                                        />
                                        <span className="checkbox-dot" style={{ background: modelColor(i) }} />
                                        {m.name || m.id.toUpperCase()}
                                        {loadingModels[m.id] && <span className="model-loading-indicator" />}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="analyze-btn-row">
                        <button
                            className="analyze-btn"
                            onClick={handleAnalyze}
                            disabled={!canAnalyze}
                        >
                            {btnLabel}
                        </button>
                    </div>

                    {apiError && <p className="expert-error">{apiError}</p>}
                </section>

                {/* ── 2. Metrics chart ── */}
                {isLoadingAny ? (
                    <div className="expert-section expert-loading">
                        <div className="spinner" /><p>Caricamento dati analytics...</p>
                    </div>
                ) : chartData.length > 0 && (
                    <section className="expert-section">
                        <h2 className="section-title">
                            {isMultiModel
                                ? 'Confronto Cross-Modello — Tutte le Metodologie'
                                : 'Panoramica Metriche — Tutte le Metodologie'}
                        </h2>
                        <p className="section-desc">
                            {isMultiModel
                                ? 'Ogni coppia Modello–Metodologia è una barra separata. Confronto diretto su BBQ, StereoSet e MMLU.'
                                : 'Ogni gruppo di barre è una metodologia. Confronto diretto su BBQ, StereoSet e MMLU.'}
                        </p>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={440}>
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 36, right: 20, left: 30, bottom: 100 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                                    <XAxis
                                        dataKey="method"
                                        tick={{ fill: '#0f172a', fontSize: isMultiModel ? 10 : 12, fontWeight: 600 }}
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={100}
                                    />
                                    <YAxis tick={{ fill: '#0f172a', fontSize: 12, fontWeight: 600 }} domain={[0, 100]} />
                                    <Tooltip {...tooltipStyle} />
                                    <Legend verticalAlign="top" height={36}
                                        wrapperStyle={{ color: '#0f172a', fontWeight: 600, fontSize: '0.88rem' }} />
                                    {Object.entries(METRIC_COLORS).map(([key, color]) => (
                                        <Bar key={key} dataKey={key} fill={color} radius={[3, 3, 0, 0]} maxBarSize={18} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

                {/* ── 3. LLM analysis output ── */}
                <section className="expert-section">
                    <h2 className="section-title">Interpretazione LLM</h2>
                    <p className="section-desc">
                        L'analisi è generata da Llama 3.1 via Groq, configurato come Senior Researcher in AI Safety.
                        Seleziona {isMultiModel ? 'i modelli da confrontare' : 'il modello'} e premi{' '}
                        <strong>{isMultiModel ? 'Confronta Modelli con LLM' : 'Analizza con LLM'}</strong>.
                    </p>
                    <div className="analysis-box">
                        {analyzing ? (
                            <div className="analysis-loading">
                                <div className="spinner" />
                                <p>
                                    {isMultiModel
                                        ? 'Il modello sta eseguendo il confronto cross-modello...'
                                        : 'Il modello sta analizzando i dati di bias...'}
                                </p>
                            </div>
                        ) : analysis ? (
                            <div className="analysis-content">{renderAnalysis(analysis)}</div>
                        ) : (
                            <div className="analysis-placeholder">
                                Seleziona {isMultiModel ? 'i modelli' : 'il modello'} e premi{' '}
                                <strong>{isMultiModel ? 'Confronta Modelli con LLM' : 'Analizza con LLM'}</strong>{' '}
                                per ottenere{' '}
                                {isMultiModel
                                    ? 'un confronto critico cross-modello'
                                    : "un'analisi verticale approfondita"}{' '}
                                dei risultati di de-biasing.
                            </div>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
};

export default ExpertAnalysis;
