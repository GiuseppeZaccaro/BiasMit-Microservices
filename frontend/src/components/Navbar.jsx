import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const NAV_LINKS = [
    { to: '/dashboard',         label: 'Dashboard' },
    { to: '/comparison-charts', label: 'Confronto Globale' },
    { to: '/expert-analysis',   label: 'Analisi Esperto' },
    { to: '/methodology',       label: 'Metodologia' },
    { to: '/bookmarks',         label: 'Miei Preferiti' },
];

const Navbar = () => {
    const { pathname } = useLocation();

    const isActive = (to) => {
        if (to === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/compare/');
        return pathname.startsWith(to);
    };

    return (
        <nav className="navbar">
            <Link to="/dashboard" className="navbar-brand">
                BiasMit&nbsp;<span className="navbar-brand-accent">AI</span>
            </Link>
            <ul className="navbar-links">
                {NAV_LINKS.map(({ to, label }) => (
                    <li key={to}>
                        <Link
                            to={to}
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
