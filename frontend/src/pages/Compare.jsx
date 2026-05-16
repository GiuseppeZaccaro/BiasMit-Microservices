import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comparePrompt } from '../services/api';
import { useBookmarks } from '../context/BookmarkContext';
import './Compare.css';

const METHOD_LABELS = {
    baseline: 'Baseline',
    caa_puntuale: 'CAA Puntuale',
    caa_block: 'CAA Block',
    fairsteer: 'FairSteer',
};

const METHOD_COLORS = {
    baseline: '#94a3b8',
    caa_puntuale: '#7fdbff',
    caa_block: '#FF8C00',
    fairsteer: '#4ade80',
};

const SS_LABELS = {
    stereo: 'Stereotipo',
    anti: 'Anti-Stereotipo',
    unrelated: 'Non Correlato',
};

const bestScoreKey = (scores) => {
    if (!scores || typeof scores !== 'object') return null;
    const entries = Object.entries(scores).filter(([, v]) => typeof v === 'number' && isFinite(v));
    if (entries.length === 0) return null;
    return entries.reduce((best, [k, v]) => v > scores[best] ? k : best, entries[0][0]);
};

const Compare = () => {
    const { dataset, model, category, id } = useParams();
    const navigate = useNavigate();
    const { findBookmark, addBookmark, removeBookmark } = useBookmarks();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [bmLoading, setBmLoading] = useState(false);

    const exampleId = parseInt(id, 10);
    const existingBookmark = findBookmark(dataset, category, model, exampleId);
    const isBookmarked = !!existingBookmark;

    useEffect(() => {
        setLoading(true);
        setError(null);
        comparePrompt(dataset, model, category, id)
            .then(res => setData(res.data))
            .catch(() => setError('Impossibile caricare i dati di confronto.'))
            .finally(() => setLoading(false));
    }, [dataset, model, category, id]);

    const getPromptText = () => {
        if (!data?.original_data) return '';
        const od = data.original_data;
        if (dataset === 'bbq') return `${od.context || ''} ${od.question || ''}`.trim();
        return od.display_sentence || od.sentence || od.target || JSON.stringify(od);
    };

    const handleBookmark = async () => {
        setBmLoading(true);
        try {
            if (isBookmarked && existingBookmark) {
                await removeBookmark(existingBookmark.id);
            } else {
                await addBookmark({
                    dataset,
                    modelName: model,
                    category,
                    exampleId,
                    promptText: getPromptText(),
                    modelResponse: JSON.stringify(data?.comparison),
                    methodUsed: 'all',
                });
            }
        } catch (e) {
            console.error('Errore preferito:', e);
        } finally {
            setBmLoading(false);
        }
    };

    const renderResponse = (value) => {
        if (value === null || value === undefined) return <p className="resp-na">N/A</p>;
        if (typeof value === 'object') {
            return (
                <div className="resp-scores">
                    {Object.entries(value).map(([k, v]) => (
                        <div key={k} className="resp-score-row">
                            <span className="score-key">{k}</span>
                            <span className="score-val">{String(v)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return <p className="resp-text">{String(value)}</p>;
    };

    const renderSSResponse = (scores, sentences) => {
        if (!scores || typeof scores !== 'object') return renderResponse(scores);
        const best = bestScoreKey(scores);
        return (
            <div className="ss-scores">
                {['stereo', 'anti', 'unrelated'].map((key) => {
                    const isBest = key === best;
                    const score = scores[key];
                    const sentence = sentences?.[key];
                    return (
                        <div key={key} className={`ss-score-item ${isBest ? 'ss-best' : ''}`}>
                            <div className="ss-item-header">
                                <span className="ss-item-label">{SS_LABELS[key]}</span>
                                <span className={`ss-item-score ${isBest ? 'ss-best-score' : ''}`}>
                                    {typeof score === 'number' ? score.toFixed(4) : String(score ?? 'N/A')}
                                </span>
                            </div>
                            {sentence && <p className="ss-item-sentence">{sentence}</p>}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="compare-wrapper">
                <div className="compare-loading">
                    <div className="spinner"></div>
                    <p>Caricamento confronto...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="compare-wrapper">
                <div className="compare-error">
                    <p>{error || 'Dati non disponibili'}</p>
                    <button className="back-btn" onClick={() => navigate(-1)}>← Torna indietro</button>
                </div>
            </div>
        );
    }

    const od = data.original_data || {};
    const sentences = data.sentences || {};
    const hasSentences = Object.keys(sentences).length > 0;
    const isStereoSet = dataset === 'stereoset';

    return (
        <div className="compare-wrapper">
            <header className="compare-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Dashboard</button>
                <div className="compare-header-center">
                    <h1 className="compare-title">Confronto Risposte</h1>
                    <div className="compare-meta">
                        <span className="meta-tag">{dataset.toUpperCase()}</span>
                        <span className="meta-tag">{model.toUpperCase()}</span>
                        <span className="meta-tag">{category}</span>
                        <span className="meta-tag">ID: {id}</span>
                    </div>
                </div>
                <button
                    className={`bookmark-btn ${isBookmarked ? 'saved' : ''}`}
                    onClick={handleBookmark}
                    disabled={bmLoading}
                >
                    {bmLoading ? '...' : isBookmarked ? '★ Rimuovi' : '☆ Salva nei Preferiti'}
                </button>
            </header>

            <div className="compare-content">
                {isStereoSet && (
                    <div className="info-guide-box">
                        <span className="info-guide-icon">ℹ</span>
                        <div>
                            <strong>Guida alla lettura:</strong> I valori sono log-probabilità (es. −21.4).
                            Il valore <strong>meno negativo</strong> (più vicino allo zero) indica la frase
                            che il modello considera <strong>più probabile</strong>.
                            La riga evidenziata in <span className="guide-highlight-label">verde</span> mostra
                            la scelta più probabile per quel metodo.
                        </div>
                    </div>
                )}

                <section className="prompt-full-section">
                    <h3 className="section-label">Prompt Completo</h3>
                    <div className="prompt-full-box">
                        {!isStereoSet ? (
                            <>
                                <p className="context-text">{od.context}</p>
                                <p className="question-text">
                                    <span className="q-label">Domanda:</span> {od.question}
                                </p>
                                <div className="answers-row">
                                    <span className="answer-chip">A: {od.ans0}</span>
                                    <span className="answer-chip">B: {od.ans1}</span>
                                    <span className="answer-chip">C: {od.ans2}</span>
                                </div>
                                {od.label !== undefined && (
                                    <p className="correct-label">
                                        Risposta corretta: <strong>{['A', 'B', 'C'][od.label] ?? od.label}</strong>
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="question-text">
                                    <span className="q-label">Target:</span> {od.target}
                                    {od.bias_type && (
                                        <span className="meta-inline"> · Categoria bias: {od.bias_type}</span>
                                    )}
                                </p>
                                {hasSentences ? (
                                    <div className="ss-sentences-full">
                                        <p className="ss-sentences-title">Frasi da valutare:</p>
                                        {['stereo', 'anti', 'unrelated'].map(key =>
                                            sentences[key] && (
                                                <div key={key} className={`ss-sentence-item ss-item-${key}`}>
                                                    <span className="ss-sentence-badge">{SS_LABELS[key]}</span>
                                                    <span className="ss-sentence-fulltext">{sentences[key]}</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <p className="context-text">
                                        {od.sentence || od.display_sentence || od.target || 'Dati frase non disponibili'}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </section>

                <section className="responses-section">
                    <h3 className="section-label">Risposte dei 4 Metodi</h3>
                    <div className="responses-grid">
                        {Object.entries(data.comparison || {}).map(([method, response]) => (
                            <div
                                key={method}
                                className="response-card"
                                style={{ borderTopColor: METHOD_COLORS[method] || '#7fdbff' }}
                            >
                                <div
                                    className="response-card-header"
                                    style={{ color: METHOD_COLORS[method] || '#7fdbff' }}
                                >
                                    {METHOD_LABELS[method] || method}
                                </div>
                                <div className="response-card-body">
                                    {isStereoSet
                                        ? renderSSResponse(response, sentences)
                                        : renderResponse(response)
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Compare;
