import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ReferenceLine,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
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

function dynamicBars(methods) {
    return methods.map((m, i) => (
        <Bar key={m} dataKey={m} fill={barColor(m, i)} radius={[4, 4, 0, 0]} maxBarSize={28} />
    ));
}

const bbqXAxis = (
    <XAxis
        dataKey="category"
        tick={{ fill: '#94a3b8', fontSize: 11 }}
        angle={-45}
        textAnchor="end"
        interval={0}
        height={100}
    />
);

const ssXAxis = (
    <XAxis
        dataKey="category"
        tick={{ fill: '#94a3b8', fontSize: 11 }}
        angle={-45}
        textAnchor="end"
        interval={0}
        height={100}
    />
);

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
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    useEffect(() => {
        setLoading(true);
        getComparisonAnalytics()
            .then(res => setData(res.data))
            .catch(() => setError('Impossibile caricare i dati di confronto.'))
            .finally(() => setLoading(false));
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

                {/* ── 1. Radar delle Performance ── */}
                <section className="comparison-section">
                    <h2 className="section-title">Radar delle Performance</h2>
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

                {/* ── 2. BBQ Bias Score per Categoria ── */}
                {(data.bbq_bias_chart || []).length > 0 && (
                    <section className="comparison-section">
                        <h2 className="section-title">BBQ Bias Score per Categoria</h2>
                        <p className="section-desc">
                            Score direzionale del bias per ogni categoria sociale (<strong>ideale: 0</strong>).
                            Negativo = tendenza anti-stereotipo. Positivo = tendenza stereotipante.
                            Ogni gruppo di barre rappresenta una categoria; ogni barra un metodo.
                        </p>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={500}>
                                <BarChart
                                    data={data.bbq_bias_chart}
                                    margin={{ top: 36, right: 20, left: 30, bottom: 120 }}
                                    barGap={6}
                                    barCategoryGap="25%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                    {bbqXAxis}
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 4" />
                                    <Tooltip {...tooltipStyle} formatter={(v) => [v.toFixed(4)]} />
                                    <Legend verticalAlign="top" height={40} wrapperStyle={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                                    {dynamicBars(methods)}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

                {/* ── 3. BBQ Accuracy per Categoria ── */}
                {(data.bbq_accuracy_chart || []).length > 0 && (
                    <section className="comparison-section">
                        <h2 className="section-title">BBQ Accuracy per Categoria</h2>
                        <p className="section-desc">
                            Percentuale di risposte corrette sulla disambiguazione per ogni categoria.
                            <strong> Più alto = meglio.</strong> Evidenzia dove ogni metodo performa meglio.
                        </p>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={500}>
                                <BarChart
                                    data={data.bbq_accuracy_chart}
                                    margin={{ top: 36, right: 20, left: 30, bottom: 120 }}
                                    barGap={6}
                                    barCategoryGap="25%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                    {bbqXAxis}
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
                                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)}%`]} />
                                    <Legend verticalAlign="top" height={40} wrapperStyle={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                                    {dynamicBars(methods)}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

                {/* ── 4. StereoSet LMS per Categoria ── */}
                {(data.ss_lms_chart || []).length > 0 && (
                    <section className="comparison-section">
                        <h2 className="section-title">StereoSet LMS per Categoria</h2>
                        <p className="section-desc">
                            Language Modeling Score per dominio di bias.
                            <strong> Più alto = meglio.</strong> Valori bassi indicano degrado linguistico post-steering.
                        </p>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={420}>
                                <BarChart
                                    data={data.ss_lms_chart}
                                    margin={{ top: 36, right: 20, left: 30, bottom: 120 }}
                                    barGap={6}
                                    barCategoryGap="25%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                    {ssXAxis}
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" domain={[60, 100]} />
                                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)}%`]} />
                                    <Legend verticalAlign="top" height={40} wrapperStyle={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                                    {dynamicBars(methods)}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

                {/* ── 5. StereoSet SS per Categoria ── */}
                {(data.ss_ss_chart || []).length > 0 && (
                    <section className="comparison-section">
                        <h2 className="section-title">StereoSet SS per Categoria</h2>
                        <p className="section-desc">
                            Stereotype Score per dominio. <strong>Ideale ≈ 50%.</strong>
                            La linea tratteggiata indica il punto di neutralità.
                        </p>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={420}>
                                <BarChart
                                    data={data.ss_ss_chart}
                                    margin={{ top: 36, right: 20, left: 30, bottom: 120 }}
                                    barGap={6}
                                    barCategoryGap="25%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                    {ssXAxis}
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" domain={[45, 80]} />
                                    <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4"
                                        label={{ value: '50% ideale', fill: '#64748b', fontSize: 10, position: 'insideTopRight' }} />
                                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)}%`]} />
                                    <Legend verticalAlign="top" height={40} wrapperStyle={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                                    {dynamicBars(methods)}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

                {/* ── 6. Confronto Metriche per Metodo (summary) ── */}
                <section className="comparison-section">
                    <h2 className="section-title">Panoramica Metriche per Metodo</h2>
                    <p className="section-desc">
                        Ogni gruppo di barre rappresenta un metodo. Le cinque metriche vengono comparate
                        direttamente per valutare il trade-off tra de-biasing e mantenimento delle capacità.
                    </p>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={460}>
                            <BarChart
                                data={data.metrics_bar || []}
                                margin={{ top: 36, right: 20, left: 30, bottom: 100 }}
                                barGap={4}
                                barCategoryGap="30%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                <XAxis dataKey="method" tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    angle={-35} textAnchor="end" interval={0} height={90} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                                <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v.toFixed(2)}%`, n]} />
                                <Legend verticalAlign="top" height={40} wrapperStyle={{ color: '#94a3b8', fontSize: '0.8rem' }} />
                                {Object.entries({
                                    'BBQ Accuracy':  '#7fdbff',
                                    'StereoSet LMS': '#4ade80',
                                    'StereoSet SS':  '#FF8C00',
                                    'ICAT Score':    '#a78bfa',
                                    'MMLU Accuracy': '#f87171',
                                }).map(([key, color]) => (
                                    <Bar key={key} dataKey={key} fill={color} radius={[4, 4, 0, 0]} maxBarSize={20} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* ── 7. Guida alla Lettura ── */}
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
