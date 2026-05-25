import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { BookmarkProvider } from './context/BookmarkContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Compare from './pages/Compare';
import Bookmarks from './pages/Bookmarks';
import ModelStats from './pages/ModelStats';
import ComparisonCharts from './pages/ComparisonCharts';
import ExpertAnalysis from './pages/ExpertAnalysis';
import Methodology from './pages/Methodology';

//creazione di un layout component in modo da non dover incollare il componente in ogni pagina
const WithNavbar = () => (
    <>
        <Navbar />
        <Outlet />{/*segnaposto dinamico che di react router che disegna il componente e a seconda dell'URL inserisce la pagina*/}
    </>
);

function App() {
    return (
        //avvolgo l'intera app nel BookmarkProvider in modo che ogni pagina possa prendere
        //  i segnalibri liberamente e quindi non devo inserirli manualmente
        //si tratta di un componente che avvolge l'albero dei componenti permettendo la condivisione del contesto ai componenti figli
        <BookmarkProvider>
            <Router>{/*componente che permette la sostituzione istantanea dei componenti dello schermo*/}
                <Routes>
                    {/*i due punti definiscono i parametri dinamici */}
                    <Route path="/" element={<Home />} />
                    <Route element={<WithNavbar />}>{/*pagine che avranno il componente */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/compare/:dataset/:model/:category/:id" element={<Compare />} />
                        <Route path="/bookmarks" element={<Bookmarks />} />
                        <Route path="/stats/:model" element={<ModelStats />} />
                        <Route path="/comparison-charts" element={<ComparisonCharts />} />
                        <Route path="/expert-analysis" element={<ExpertAnalysis />} />
                        <Route path="/methodology" element={<Methodology />} />
                    </Route>
                </Routes>
            </Router>
        </BookmarkProvider>
    );
}

export default App;
