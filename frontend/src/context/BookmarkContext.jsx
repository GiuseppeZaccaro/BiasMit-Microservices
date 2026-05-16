import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
    getBookmarks,
    addBookmark as apiAdd,
    deleteBookmark as apiDelete,
} from '../services/api';

const BookmarkContext = createContext(null);

export const BookmarkProvider = ({ children }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [initialized, setInitialized] = useState(false);
    const pendingRef = useRef(new Set());

    // Carica tutti i preferiti dal DB all'avvio
    useEffect(() => {
        getBookmarks()
            .then(res => setBookmarks(res.data || []))
            .catch(() => {})
            .finally(() => setInitialized(true));
    }, []);

    // Aggiunge un preferito e aggiorna lo stato globale (protetto da doppio click)
    const addBookmark = async (bookmarkData) => {
        const key = `${bookmarkData.dataset}|${bookmarkData.modelName}|${bookmarkData.category}|${bookmarkData.exampleId}`;
        if (pendingRef.current.has(key)) return null;
        pendingRef.current.add(key);
        try {
            const res = await apiAdd(bookmarkData);
            const saved = res.data;
            setBookmarks(prev =>
                prev.some(b => b.id === saved.id) ? prev : [...prev, saved]
            );
            return saved;
        } finally {
            pendingRef.current.delete(key);
        }
    };

    // Rimuove un preferito per DB id e aggiorna lo stato globale
    const removeBookmark = async (dbId) => {
        await apiDelete(dbId);
        setBookmarks(prev => prev.filter(b => b.id !== dbId));
    };

    // Trova il record bookmark completo (con DB id) se esiste
    const findBookmark = (dataset, category, modelName, exampleId) =>
        bookmarks.find(
            b =>
                b.dataset === dataset &&
                b.category === category &&
                b.modelName === modelName &&
                b.exampleId === exampleId
        ) ?? null;

    return (
        <BookmarkContext.Provider
            value={{ bookmarks, initialized, addBookmark, removeBookmark, findBookmark }}
        >
            {children}
        </BookmarkContext.Provider>
    );
};

export const useBookmarks = () => useContext(BookmarkContext);
