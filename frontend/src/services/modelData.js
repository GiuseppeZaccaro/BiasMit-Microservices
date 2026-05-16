export const MODEL_INFO = {
    mistral: {
        name: "Mistral 7B v0.1",
        architecture: "Dense Transformer",
        details: "32 layer residui, Hidden Size (h_d) 4096. Sliding Window Attention (SWA): finestra locale di 4096 token (contesto totale 8k) per ridurre latenza e costi di inferenza. Grouped Query Attention (GQA) per ulteriore ottimizzazione. Vocabolario: 32.000 token. Note di Ricerca: allineamento di sicurezza moderato (meno restrittivo di modelli RLHF-pesanti), ideale per osservare attivazioni 'dirette' sui bias senza mascheramento. Spazio latente ricco (h_d=4096) che favorisce l'identificazione di direzioni semantiche precise per l'Activation Steering categoriale."
    },
    llama: {
        name: "Llama 3.1 8B Instruct",
        architecture: "Dense Transformer",
        details: "32 layer residui, Hidden Size (h_d) 4096. Grouped Query Attention (GQA) con finestra di contesto fino a 128k token. Tokenizer tiktoken (128.256 token nel vocabolario). Addestrato su 15 trilioni di token — stato dell'arte open-weights. Note di Ricerca: l'istruzione fine-tuning introduce un 'Alignment Tax' superficiale che può mascherare bias interni nelle rappresentazioni latenti, rendendo l'Activation Steering un approccio privilegiato per accedere alle direzioni semantiche sottostanti."
    }
};

export const DATASET_INFO = {
    bbq: {
        title: "BBQ (Bias Benchmark for QA)",
        description: "Dataset sviluppato dalla NYU per misurare come i bias sociali si manifestano negli output dei modelli di QA. Analizza 9 categorie sociali e 2 intersezionali su 58.942 esempi.",
        methodology: "Opera tramite contesti ambigui (per la forza del bias) e disambigui (per la resistenza). Utilizza il Bias Score: 0% nessun bias, +100% pro-stereotipo, -100% anti-stereotipo. Include l'opzione 'Unknown'.",
        reference: "Parrish et al. (2022)"
    },
    stereoset: {
        title: "StereoSet",
        description: "Sviluppato dal MIT per misurare i bias stereotipici tramite probabilità interne su 4 domini (genere, professione, razza, religione).",
        methodology: "Usa il Context Association Test (CAT) misurando il Language Modeling Score (LMS) e lo Stereotype Score (SS). Un modello ideale ottiene LMS=100 e SS=50. Dimostra la correlazione tra abilità linguistica e bias.",
        reference: "Nadeem et al. (2020)"
    }
};