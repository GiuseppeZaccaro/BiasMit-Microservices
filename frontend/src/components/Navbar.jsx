import { Link, useLocation } from 'react-router-dom';//Link è il componente che permette di cambiare pagina ricaricandola
import './Navbar.css';

//array di oggetti
const NAV_LINKS = [
    { to: '/dashboard',         label: 'Dashboard' },
    { to: '/comparison-charts', label: 'Confronto Globale' },
    { to: '/expert-analysis',   label: 'Analisi Esperto' },
    { to: '/methodology',       label: 'Metodologia' },
    { to: '/bookmarks',         label: 'Miei Preferiti' },
];

//definizione del componente
const Navbar = () => {
    const { pathname } = useLocation();//usa la destrutturazione per estrarre il pathname
    //funzione che stabilisce se un link deve apparire evidenziato
    const isActive = (to) => {
        if (to === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/compare/');
        return pathname.startsWith(to);//verifica se l'URL inizia con il percorso del link
    };

    return (
        <nav className="navbar">
            {/*cliccando sul logo si torna sempre alla dashboard */}
            <Link to="/dashboard" className="navbar-brand">
                BiasMit&nbsp;<span className="navbar-brand-accent">AI</span>
            </Link>
            <ul className="navbar-links">
                {/*dinamicità del componente: itero l'array NAV_LINKS e restituisco un elemento */}
                {NAV_LINKS.map(({ to, label }) => (
                    <li key={to}>
              
                        <Link
                            //assegna il percorso 
                            to={to} //chiave univoca per ogni elemento della lista
                            //aggiungo la classe navbar-link-active se si attiva la funzione isActive
                            className={`navbar-link${isActive(to) ? ' navbar-link-active' : ''}`}
                        >
                            {label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default Navbar;
