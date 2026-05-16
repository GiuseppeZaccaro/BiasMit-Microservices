import { useNavigate } from 'react-router-dom';
import { useBookmarks } from '../context/BookmarkContext';
import './Bookmarks.css';

const DATASET_LABELS = { bbq: 'BBQ', stereoset: 'StereoSet' };

const Bookmarks = () => {
    const navigate = useNavigate();
    const { bookmarks, initialized, removeBookmark } = useBookmarks();

    // Deduplica per sicurezza: tieni solo il primo record per combinazione univoca
    const seen = new Set();
    const uniqueBookmarks = bookmarks.filter(b => {
        const key = `${b.dataset}|${b.modelName}|${b.category}|${b.exampleId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const handleOpen = (b) => {
        navigate(`/compare/${b.dataset}/${b.modelName}/${b.category}/${b.exampleId}`);
    };

    const handleDelete = async (b, e) => {
        e.stopPropagation();
        await removeBookmark(b.id);
    };

    if (!initialized) {
        return (
            <div className="bm-wrapper">
                <div className="bm-loading">
                    <div className="bm-spinner"></div>
                    <p>Caricamento preferiti...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bm-wrapper">
            <header className="bm-header">
                <button className="bm-back-btn" onClick={() => navigate('/dashboard')}>
                    ← Dashboard
                </button>
                <div className="bm-header-center">
                    <h1 className="bm-title">I Miei Preferiti</h1>
                    <span className="bm-count">{uniqueBookmarks.length} prompt salvati</span>
                </div>
                <div style={{ width: '120px' }} />
            </header>

            <div className="bm-content">
                {uniqueBookmarks.length === 0 ? (
                    <div className="bm-empty">
                        <p className="bm-empty-text">Nessun preferito salvato.</p>
                        <p className="bm-empty-hint">
                            Esplora i prompt nella Dashboard e clicca ☆ per salvarli qui.
                        </p>
                        <button className="bm-go-btn" onClick={() => navigate('/dashboard')}>
                            Vai alla Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="bm-grid">
                        {uniqueBookmarks.map(b => (
                            <div
                                key={b.id}
                                className="bm-card"
                                onClick={() => handleOpen(b)}
                                title="Clicca per confrontare le risposte"
                            >
                                <div className="bm-card-meta">
                                    <span className="bm-tag bm-tag-dataset">
                                        {DATASET_LABELS[b.dataset] || b.dataset}
                                    </span>
                                    <span className="bm-tag bm-tag-model">
                                        {b.modelName?.toUpperCase()}
                                    </span>
                                    <span className="bm-tag bm-tag-cat">{b.category}</span>
                                    <span className="bm-tag bm-tag-id">#{b.exampleId}</span>
                                </div>

                                <p className="bm-card-text">
                                    {b.promptText || 'Testo non disponibile'}
                                </p>

                                <div className="bm-card-footer">
                                    <span className="bm-method-tag">{b.methodUsed}</span>
                                    <button
                                        className="bm-delete-btn"
                                        onClick={(e) => handleDelete(b, e)}
                                        title="Rimuovi dai preferiti"
                                    >
                                        × Rimuovi
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Bookmarks;
