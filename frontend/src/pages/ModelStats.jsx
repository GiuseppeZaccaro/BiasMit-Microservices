import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { getModelAnalytics } from '../services/api';
import './ModelStats.css';

const METHOD_COLORS = {
    'Baseline':     '#94a3b8',
    'CAA Puntuale': '#7fdbff',
    'FairSteer':    '#4ade80',
};

const ModelStats = () => {
    const { model } = useParams();
    const navigate = useNavigate();
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState(null);

    useEffect(() => {
        setLoading(true);
        getModelAnalytics(model)
            .then(res => setData(res.data))
            .catch(() => setError('Impossibile caricare i dati analytics.'))
            .finally(() => setLoading(false));
    }, [model]);

    if (loading) return (
        <div className="stats-wrapper">
            <div className="stats-loading"><div className="spinner" /><p>Caricamento statistiche...</p></div>
        </div>
    );
    if (error || !data) return (
        <div className="stats-wrapper">
            <div className="stats-error"><p>{error || 'Dati non disponibili'}</p>
                <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            </div>
        </div>
    );

    const methods = (data.summary || []).map(s => s.method);

    const tooltipStyle = {
        contentStyle: { background: '#0a1628', border: '1px solid #1e3a5f', color: '#e2e8f0' },
        formatter: (v, name) => [typeof v === 'number' ? v.toFixed(2) : v, name],
    };

    return (
        <div className="stats-wrapper">
            <header className="stats-header">
                <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
                <div>
                    <h1 className="stats-title">Analisi Statistica &mdash; <span className="accent">{model.toUpperCase()}</span></h1>
                    <p className="stats-subtitle">Confronto delle quattro metodologie di de-biasing su tutte le metriche</p>
                </div>
            </header>

            <div className="stats-content">

                {/* ── Summary Cards ── */}
                <section className="stats-section">
                    <h2 className="section-title">Panoramica per Metodo</h2>
                    <div className="summary-cards">
                        {(data.summary || []).map((s, i) => (
                            <div key={i} className="summary-card" style={{ borderTopColor: METHOD_COLORS[s.method] || '#7fdbff' }}>
                                <h3 style={{ color: METHOD_COLORS[s.method] || '#7fdbff' }}>{s.method}</h3>
                                <div className="card-metrics">
                                    <div className="metric-row"><span>MMLU</span><span>{s.mmlu_acc.toFixed(1)}%</span></div>
                                    <div className="metric-row"><span>LMS</span><span>{s.stereoset_lms.toFixed(1)}%</span></div>
                                    <div className="metric-row"><span>SS</span><span>{s.stereoset_ss.toFixed(1)}%</span></div>
                                    <div className="metric-row"><span>ICAT</span><span>{s.stereoset_icat.toFixed(2)}</span></div>
                                    <div className="metric-row"><span>BBQ Acc</span><span>{s.bbq_acc.toFixed(1)}%</span></div>
                                    <div className="metric-row bias-row">
                                        <span>Bias Score</span>
                                        <span className={s.bbq_bias > 0 ? 'bias-positive' : 'bias-negative'}>
                                            {s.bbq_bias.toFixed(4)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── BBQ Accuracy ── */}
                <section className="stats-section">
                    <h2 className="section-title">BBQ Accuracy per Categoria</h2>
                    <p className="section-desc">
                        Percentuale di risposte corrette sulla disambiguazione (BBQ). <strong>Più alto = meglio.</strong>
                        Misura la capacità del modello di scegliere la risposta corretta evitando stereotipi.
                    </p>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={480}>
                            <BarChart data={data.bbq_accuracy_chart || []} margin={{ top: 36, right: 20, left: 30, bottom: 120 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-45} textAnchor="end" interval={0} height={100} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" domain={[0, 55]} />
                                <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)}%`]} />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#94a3b8' }} />
                                {methods.map(m => <Bar key={m} dataKey={m} fill={METHOD_COLORS[m] || '#7fdbff'} radius={[3, 3, 0, 0]} maxBarSize={24} />)}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* ── BBQ Bias ── */}
                <section className="stats-section">
                    <h2 className="section-title">BBQ Bias Score per Categoria</h2>
                    <p className="section-desc">
                        Score direzionale del bias (<strong>ideale: 0</strong>). Negativo = tendenza anti-stereotipo,
                        positivo = tendenza stereotipante. La linea tratteggiata marca lo zero.
                    </p>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={480}>
                            <BarChart data={data.bbq_bias_chart || []} margin={{ top: 36, right: 20, left: 30, bottom: 120 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-45} textAnchor="end" interval={0} height={100} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 4" />
                                <Tooltip {...tooltipStyle} formatter={(v) => [v.toFixed(4)]} />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#94a3b8' }} />
                                {methods.map(m => <Bar key={m} dataKey={m} fill={METHOD_COLORS[m] || '#7fdbff'} radius={[3, 3, 0, 0]} maxBarSize={24} />)}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* ── StereoSet LMS ── */}
                <section className="stats-section">
                    <h2 className="section-title">StereoSet LMS per Categoria</h2>
                    <p className="section-desc">
                        Language Modeling Score: il modello preferisce frasi sensate a frasi nonsense.
                        <strong> Più alto = meglio.</strong> Valori molto bassi indicano degrado linguistico post-steering.
                    </p>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={data.ss_lms_chart || []} margin={{ top: 36, right: 20, left: 30, bottom: 120 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-45} textAnchor="end" interval={0} height={100} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" domain={[60, 80]} />
                                <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)}%`]} />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#94a3b8' }} />
                                {methods.map(m => <Bar key={m} dataKey={m} fill={METHOD_COLORS[m] || '#7fdbff'} radius={[3, 3, 0, 0]} maxBarSize={30} />)}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* ── StereoSet SS ── */}
                <section className="stats-section">
                    <h2 className="section-title">StereoSet SS per Categoria</h2>
                    <p className="section-desc">
                        Stereotype Score: preferenza del modello per frasi stereotipate vs. anti-stereotipate.
                        <strong> Ideale ≈ 50%.</strong> La linea tratteggiata indica lo zero-bias. Sopra 50% = più bias.
                    </p>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={data.ss_ss_chart || []} margin={{ top: 36, right: 20, left: 30, bottom: 120 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-45} textAnchor="end" interval={0} height={100} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" domain={[50, 80]} />
                                <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" label={{ value: '50% ideale', fill: '#64748b', fontSize: 10, position: 'insideTopRight' }} />
                                <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toFixed(1)}%`]} />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#94a3b8' }} />
                                {methods.map(m => <Bar key={m} dataKey={m} fill={METHOD_COLORS[m] || '#7fdbff'} radius={[3, 3, 0, 0]} maxBarSize={30} />)}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default ModelStats;
