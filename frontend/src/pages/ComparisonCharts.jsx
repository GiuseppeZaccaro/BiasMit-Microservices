import { useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Tooltip, Legend,
} from 'recharts';
import { getComparisonAnalytics } from '../services/api';
import './ComparisonCharts.css';

// Per-model color palettes (high contrast, model-branded)
const MODEL_PALETTES = {
    mistral: {
        'Baseline':     '#1e3a8a',  // dark navy blue
        'CAA Puntuale': '#3b82f6',  // vivid blue
        'FairSteer':    '#06b6d4',  // cyan
    },
    llama: {
        'Baseline':     '#047857',  // dark emerald
        'CAA Puntuale': '#10b981',  // emerald green
        'FairSteer':    '#34d399',  // mint
    },
};

// Single-model fallback (when only one model is present)
const METHOD_COLORS = {
    'Baseline':     '#94a3b8',
    'CAA Puntuale': '#7fdbff',
    'FairSteer':    '#4ade80',
};

const FALLBACK_PALETTE = ['#94a3b8', '#7fdbff', '#FF8C00', '#4ade80', '#a78bfa', '#f87171', '#fbbf24', '#60a5fa'];

function barColor(key, index) {
    const lower = key.toLowerCase();
    const palette = lower.includes('mistral') ? MODEL_PALETTES.mistral
                  : lower.includes('llama')   ? MODEL_PALETTES.llama
                  : null;

    if (palette) {
        for (const [method, color] of Object.entries(palette)) {
            if (key.endsWith(method)) return color;
        }
        const colors = Object.values(palette);
        return colors[index % colors.length];
    }

    if (METHOD_COLORS[key]) return METHOD_COLORS[key];
    return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

// ────────────────────────────────────────────────────────────────────────────
// Shared chart helpers
// ────────────────────────────────────────────────────────────────────────────

const tooltipStyle = {
    contentStyle: { background: '#0a1628', border: '1px solid #1e3a5f', color: '#e2e8f0' },
    formatter: (v, name) => [typeof v === 'number' ? v.toFixed(2) : v, name],
};

// ────────────────────────────────────────────────────────────────────────────
// Small Multiples — per-model radar helpers
// ────────────────────────────────────────────────────────────────────────────

const RADAR_SHORT_LABELS = {
    'BBQ Accuracy':  'BBQ Acc',
    'StereoSet LMS': 'LMS',
    'StereoSet SS':  'SS',
    'ICAT Score':    'ICAT',
    'MMLU Accuracy': 'MMLU',
};

function buildModelRadarData(models, radarData, methods) {
    const isMulti = models.length > 1;
    return models.map(mid => {
        const modelMethods = isMulti
            ? methods.filter(k => k.split(' — ')[0]?.toLowerCase().includes(mid.toLowerCase()))
            : methods;
        if (!modelMethods.length) return null;
        const data = (radarData || []).map(row => {
            const vals = modelMethods.map(k => row[k] ?? 0);
            const avg  = vals.reduce((a, b) => a + b, 0) / vals.length;
            return { metric: RADAR_SHORT_LABELS[row.metric] ?? row.metric, value: Math.round(avg * 10) / 10 };
        });
        return { modelId: mid, data };
    }).filter(Boolean);
}

function ModelRadarGrid({ models, radarData, methods }) {
    const modelRadars = buildModelRadarData(models, radarData, methods);
    if (!modelRadars.length) return null;
    return (
        <section className="comparison-section">
            <h2 className="section-title">Panoramica per Modello — Small Multiples</h2>
            <p className="section-desc">
                Ogni radar visualizza il profilo medio del modello su 5 metriche chiave,
                aggregato su tutti i metodi di de-biasing. Aree più estese indicano performance
                globalmente migliori.
            </p>
            <div className="small-multiples-grid">
                {modelRadars.map(({ modelId, data }) => {
                    const palette = MODEL_PALETTES[modelId.toLowerCase()];
                    const color   = palette ? palette['Baseline'] : FALLBACK_PALETTE[0];
                    return (
                        <div key={modelId} className="model-radar-card">
                            <p className="model-radar-card-title">{modelId.toUpperCase()}</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
                                    <PolarGrid stroke="#1e3a5f" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        dataKey="value"
                                        stroke={color} fill={color}
                                        fillOpacity={0.2} strokeWidth={2}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// METRIC_EXPLANATIONS for the legend section
// ────────────────────────────────────────────────────────────────────────────

const METRIC_EXPLANATIONS = [
    { key: 'BBQ Accuracy',  color: '#7fdbff', title: 'BBQ Accuracy',
      text: 'Accuracy sulla disambiguazione. Più alto = meglio. Evita la risposta stereotipata.' },
    { key: 'StereoSet LMS', color: '#4ade80', title: 'StereoSet LMS',
      text: 'Language Modeling Score. Più alto = meglio. Il modello preferisce frasi sensate.' },
    { key: 'StereoSet SS',  color: '#FF8C00', title: 'StereoSet SS',
      text: 'Stereotype Score. Ideale ≈ 50%. Sopra 50% = più bias stereotipante.' },
    { key: 'ICAT Score',    color: '#a78bfa', title: 'ICAT Score (0–100)',
      text: 'Score composito. Penalizza sia bias che degrado linguistico. Più alto = meglio.' },
    { key: 'MMLU Accuracy', color: '#f87171', title: 'MMLU Accuracy',
      text: 'Benchmark accademico. Verifica che le capacità generali siano mantenute dopo de-biasing.' },
];

// ────────────────────────────────────────────────────────────────────────────
// Model color legend panel
// ────────────────────────────────────────────────────────────────────────────

function ModelColorLegend({ models }) {
    if (!models || models.length <= 1) return null;
    return (
        <div className="model-color-legend">
            {models.map((mid) => {
                const palette = MODEL_PALETTES[mid.toLowerCase()];
                if (!palette) return null;
                return (
                    <div key={mid} className="model-color-group">
                        <span className="model-color-label">{mid.toUpperCase()}</span>
                        <div className="model-color-swatches">
                            {Object.entries(palette).map(([method, color]) => (
                                <span key={method} className="swatch" style={{ background: color }}>
                                    {method}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

const ComparisonCharts = () => {
    const navigate = useNavigate();
    const [{ loading, data, error }, dispatch] = useReducer(
        (_, a) => a,
        { loading: true, data: null, error: null }
    );

    useEffect(() => {
        let isMounted = true;
        dispatch({ loading: true, data: null, error: null });
        getComparisonAnalytics()
            .then(res => { if (isMounted) dispatch({ loading: false, data: res.data, error: null }); })
            .catch(() => { if (isMounted) dispatch({ loading: false, data: null, error: 'Impossibile caricare i dati di confronto.' }); });
        return () => { isMounted = false; };
    }, []);

    if (loading) return (
        <div className="comparison-wrapper">
            <div className="comparison-loading"><div className="spinner" /><p>Caricamento confronto...</p></div>
        </div>
    );
    if (error || !data) return (
        <div className="comparison-wrapper">
            <div className="comparison-error">
                <p>{error || 'Dati non disponibili'}</p>
                <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            </div>
        </div>
    );

    const methods = data.methods || [];
    const models  = data.models  || [];

    return (
        <div className="comparison-wrapper">
            <header className="comparison-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
                <div>
                    <h1 className="comparison-title">
                        Confronto Globale <span className="accent">Metodologie</span>
                    </h1>
                    <p className="comparison-subtitle">
                        Confronto inter-modello e inter-metodo su BBQ, StereoSet e MMLU
                        {models.length > 0 && ` — ${models.map(m => m.toUpperCase()).join(', ')}`}
                    </p>
                </div>
            </header>

            <div className="comparison-content">

                {/* ── 0. Color legend for models ── */}
                <ModelColorLegend models={models} />

                {/* ── 1. Small Multiples — one radar per model ── */}
                <ModelRadarGrid models={models} radarData={data.radar_data} methods={methods} />

                {/* ── 2. Radar delle Performance (multi-method overlay) ── */}
                <section className="comparison-section">
                    <h2 className="section-title">Radar delle Performance — Confronto Metodi</h2>
                    <p className="section-desc">
                        Visualizzazione multi-dimensionale delle 5 metriche principali su tutti i metodi.
                        Aree più estese verso l'esterno indicano performance migliori.
                    </p>
                    <div className="chart-container chart-center">
                        <ResponsiveContainer width="100%" height={460}>
                            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data.radar_data || []}>
                                <PolarGrid stroke="#1e3a5f" />
                                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                {methods.map((m, i) => (
                                    <Radar
                                        key={m} name={m} dataKey={m}
                                        stroke={barColor(m, i)} fill={barColor(m, i)}
                                        fillOpacity={0.15} strokeWidth={2.5}
                                    />
                                ))}
                                <Legend
                                    wrapperStyle={{ color: '#94a3b8', fontSize: '0.8rem', paddingTop: 12 }}
                                    formatter={(value) => (
                                        <span style={{ color: barColor(value, methods.indexOf(value)) }}>
                                            {value}
                                        </span>
                                    )}
                                />
                                <Tooltip {...tooltipStyle} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* ── 3. Guida alla Lettura ── */}
                <section className="comparison-section">
                    <h2 className="section-title">Guida alla Lettura delle Metriche</h2>
                    <div className="legend-grid">
                        {METRIC_EXPLANATIONS.map(({ key, color, title, text }) => (
                            <div key={key} className="legend-item">
                                <div className="legend-badge" style={{ background: `${color}18`, borderColor: color, color }}>
                                    {title}
                                </div>
                                <p>{text}</p>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
};

export default ComparisonCharts;
