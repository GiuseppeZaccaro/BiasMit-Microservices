import axios from 'axios';

// Legge l'URL del gateway dalla variabile d'ambiente Vite (iniettata a build-time),
// con fallback al default locale per lo sviluppo senza Docker.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/gateway";

// Recupera il contenuto del report .txt per un modello e metodo specifico
export const getReport = (model, method) => 
    axios.get(`${API_BASE_URL}/reports/${model}/${method}`);

// Recupera la lista delle categorie per un determinato dataset (es. bbq)
export const getCategories = (dataset) => 
    axios.get(`${API_BASE_URL}/categories/${dataset}`);

// Recupera le domande (prompt) per un dataset e una categoria specifica
export const getQuestions = (dataset, category, limit = 10) =>
    axios.get(`${API_BASE_URL}/explore/${dataset}/${category}?limit=${limit}`);

// Recupera il confronto tra i 4 metodi per un prompt specifico
export const comparePrompt = (dataset, model, category, id) =>
    axios.get(`${API_BASE_URL}/compare/${dataset}/${model}/${category}/${id}`);

// Salva un prompt nei preferiti
export const addBookmark = (bookmark) =>
    axios.post(`${API_BASE_URL}/bookmarks`, bookmark);

// Recupera tutti i preferiti salvati
export const getBookmarks = () =>
    axios.get(`${API_BASE_URL}/bookmarks`);

// Rimuove un preferito dal database
export const deleteBookmark = (id) =>
    axios.delete(`${API_BASE_URL}/bookmarks/${id}`);

// Recupera i dati analytics di un modello per tutti i metodi
export const getModelAnalytics = (model) =>
    axios.get(`${API_BASE_URL}/analytics/model/${model}`);

// Recupera i dati comparativi tra tutti i metodi
export const getComparisonAnalytics = (model = null) =>
    axios.get(`${API_BASE_URL}/analytics/comparison${model ? `?model=${model}` : ''}`);

// Recupera la lista dinamica dei modelli registrati
export const getModels = () =>
    axios.get(`${API_BASE_URL}/models`);

// Recupera la lista dinamica dei dataset disponibili
export const getDatasets = () =>
    axios.get(`${API_BASE_URL}/datasets`);

// Invia dati al servizio di interpretazione LLM
export const analyzeWithLLM = (payload) =>
    axios.post(`${API_BASE_URL}/analyze`, payload);