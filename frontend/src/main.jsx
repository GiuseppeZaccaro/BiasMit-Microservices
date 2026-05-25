import { StrictMode } from 'react' //importo componente speciale direttamente dal nucleo di React
import { createRoot } from 'react-dom/client' //funzione di ottimizzazione del rendering
import './index.css' //stili globali
import App from './App.jsx'

//assegno il controllo del div presente in index.html a React (SPA)
createRoot(document.getElementById('root')).render(
  //inserisco il componente App nel div
  <StrictMode>
    <App />
  </StrictMode>,
)
