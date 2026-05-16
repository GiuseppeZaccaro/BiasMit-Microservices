import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; 
import './Home.css';

const Home = () => {
    const [init, setInit] = useState(false);

    // Inizializza il motore delle particelle (Rete Neurale)
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const particlesOptions = {
        background: {
            color: { value: "transparent" },
        },
        fpsLimit: 120,
        interactivity: {
            events: {
                onHover: { 
                    enable: true, 
                    mode: "grab" // I neuroni si collegano al mouse quando ci passi sopra
                },
            },
            modes: {
                grab: { 
                    distance: 180, 
                    links: { opacity: 0.4 } 
                },
            },
        },
        particles: {
            color: { value: "#7fdbff" },
            links: {
                color: "#7fdbff",
                distance: 120, // Distanza leggermente ridotta per connessioni più fitte
                enable: true,
                opacity: 0.15, // Opacità ridotta per non coprire il testo
                width: 1,
            },
            move: {
                enable: true,
                speed: 0.6, // Velocità ridotta per un effetto più ipnotico e meno nervoso
                direction: "none",
                random: false,
                straight: false,
                outModes: { default: "out" },
            },
            number: {
                value: 180, // Aumentato da 100 a 180 per una rete molto più densa
                density: { 
                    enable: true, 
                    area: 800 
                },
            },
            opacity: { 
                value: { min: 0.2, max: 0.5 } // I neuroni brillano con intensità diverse
            },
            shape: { type: "circle" },
            size: { 
                value: { min: 1, max: 2.5 } 
            },
        },
        detectRetina: true,
    };

    return (
        <div className="home-container">
            {/* Sfondo animato */}
            {init && (
                <Particles
                    id="tsparticles"
                    options={particlesOptions}
                    className="particles-background"
                />
            )}

            {/* Contenuto testuale */}
            <div className="content-wrapper">
                <h1 className="title-3d">BiasMit AI</h1>
                
                <p className="description">
                    Analisi e mitigazione dei bias nei Large Language Models open source. 
                    Osserva e analizza come i più noti LLM sono influenzati dal pregiudizio 
                    e come diverse tecniche di steering possono correggerlo o peggiorarlo. 
                    Scegliendo tra BBQ e Stereoset potrai studiare aspetti diversi del pregiudizio.
                </p>

                <Link to="/dashboard" className="btn-analysis">
                    Inizia l'Analisi
                </Link>
            </div>
        </div>
    );
};

export default Home;