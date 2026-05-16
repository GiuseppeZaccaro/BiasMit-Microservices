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

const WithNavbar = () => (
    <>
        <Navbar />
        <Outlet />
    </>
);

function App() {
    return (
        <BookmarkProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route element={<WithNavbar />}>
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
