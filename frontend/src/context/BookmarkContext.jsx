import { createContext, useContext, useState, useEffect, useRef } from 'react'; //hook di React
import {
    getBookmarks,
    addBookmark as apiAdd,
    deleteBookmark as apiDelete,
} from '../services/api'; //funzioni di comunicazione con il db
//oggetto che contiene due componenti, tra cui il provider
const BookmarkContext = createContext(null);//creazione dell'oggetto contesto, i componenti vi accedono solo tramite useBookmarks
//componente che avvolge l'albero dei componenti e rende i dati disponibili ai componenti figli
export const BookmarkProvider = ({ children }) => {
    //gestione dello stato
    const [bookmarks, setBookmarks] = useState([]);//array di segnalibri salvati
    const [initialized, setInitialized] = useState(false);//flag che diventa true solo dopo la prima chiamata API
    const pendingRef = useRef(new Set());//useRef non causa re-render, serve per tenere traccia delle operazioni di aggiunta in corso

    // Carica tutti i preferiti dal DB all'avvio
    useEffect(() => {
        getBookmarks()//recupera i dati dal db
            .then(res => setBookmarks(res.data || []))
            .catch(() => {})//silenzia errori di rete
            .finally(() => setInitialized(true));
    }, []);//l'array vuoto indica che questo blocco viene eseguito solo quando il componente viene montato per la prima volta

    // Aggiunge un preferito e aggiorna lo stato globale (protetto da doppio click)
    const addBookmark = async (bookmarkData) => {
        //costruisce chiave univoca usando i dati del bookmark
        const key = `${bookmarkData.dataset}|${bookmarkData.modelName}|${bookmarkData.category}|${bookmarkData.exampleId}`;
        if (pendingRef.current.has(key)) return null;//protezione dal doppio click
        pendingRef.current.add(key);//aggiunge la chiave al Set
        try {
            const res = await apiAdd(bookmarkData);
            const saved = res.data;
            setBookmarks(prev => //aggiorna lo stato locale
                prev.some(b => b.id === saved.id) ? prev : [...prev, saved]//controllo se già esiste il bookmark
            );
            return saved;
        } finally {
            pendingRef.current.delete(key);
        }
    };

    // Rimuove un preferito per DB id e aggiorna lo stato globale
    const removeBookmark = async (dbId) => {
        await apiDelete(dbId);
        setBookmarks(prev => prev.filter(b => b.id !== dbId));//filter restituisce un nuovo array senza mutare quello precedente
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

    return (//provider mette a disposizipne ad ogni componente lo stato e le funzioni di manipolazione dei bookmarks
        <BookmarkContext.Provider
            value={{ bookmarks, initialized, addBookmark, removeBookmark, findBookmark }}
        >
            {children}
        </BookmarkContext.Provider>
    );
};
//custom hook per accedere a tutto
export const useBookmarks = () => useContext(BookmarkContext);
