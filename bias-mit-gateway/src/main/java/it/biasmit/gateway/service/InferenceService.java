package it.biasmit.gateway.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class InferenceService {

    private final RestTemplate restTemplate;

    @Value("${python.inference.url}")
    private String pythonServiceUrl;

    public InferenceService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * 1. STATISTICHE (PARSING TXT -> JSON)
     * Recupera il report grezzo da Python e lo trasforma in una mappa di metriche.
     */
    public Map<String, Object> getModelMethodReport(String model, String method) {
    String url = String.format("%s/metrics/%s/report/%s", pythonServiceUrl, model.toLowerCase(), method.toLowerCase());
    System.out.println("Chiamata a Python URL: " + url); // LOG DI DEBUG
    
    try {
        // Dichiaro esplicitamente Accept: text/plain per evitare che RestTemplate
        // tenti di deserializzare la risposta come JSON (che fallirebbe su text/plain)
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.TEXT_PLAIN, MediaType.ALL));
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        String rawText = response.getBody();
        System.out.println("Risposta ricevuta da Python: " + (rawText != null ? "OK" : "NULL"));

        if (rawText == null || rawText.isEmpty()) {
            return createErrorResponse(method, "Report vuoto");
        }
        return parseMetrics(rawText, method);
    } catch (Exception e) {
        System.err.println("Errore Gateway per metodo " + method + ": " + e.getMessage());
        return createErrorResponse(method, e.getMessage());
    }
}

    /**
     * Logica di estrazione dati tramite Espressioni Regolari
     */
    private Map<String, Object> parseMetrics(String text, String method) {
        Map<String, Object> data = new HashMap<>();
        data.put("method", method);

        // --- REGEX PER MMLU ---
        // Baseline ha [MMLU], metodi CAA hanno [MMLU_BBQ_MEAN]/[MMLU_SS_MEAN],
        // FairSteer ha [MMLU_BBQ_GLOBAL]/[MMLU_SS_GLOBAL]. Il lazy .*? cattura la prima sezione BBQ.
        data.put("mmlu_bbq_acc", extract(text, "\\[MMLU[^\\]]*\\].*?Accuracy Globale MMLU: ([\\d.]+%?)"));
        data.put("mmlu_ss_acc", extract(text, "\\[MMLU_SS[^\\]]*\\].*?Accuracy Globale MMLU: ([\\d.]+%?)"));

        // --- REGEX PER STEREOSET ---
        data.put("stereoset_lms", extract(text, "LMS: ([\\d.]+%?)"));
        data.put("stereoset_ss", extract(text, "SS: ([\\d.]+%?)"));
        data.put("stereoset_icat", extract(text, "ICAT: ([\\d.]+)"));

        // --- REGEX PER BBQ ---
        data.put("bbq_acc", extract(text, "Accuracy \\(Dis\\): ([\\d.]+%?)"));
        data.put("bbq_bias", extract(text, "Bias Score: ([\\d.-]+)"));

        return data;
    }

    private String extract(String text, String regex) {
        // Pattern.DOTALL permette al punto (.) di includere anche i caratteri "a capo" (\n)
        Pattern pattern = Pattern.compile(regex, Pattern.DOTALL);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "N/D";
    }

    private Map<String, Object> createErrorResponse(String method, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("method", method);
        error.put("error", message);
        return error;
    }

    /**
     * 2. REGISTRY — dynamic model and dataset lists
     */
    public List<?> getModels() {
        return restTemplate.getForObject(pythonServiceUrl + "/models", List.class);
    }

    public List<?> getDatasets() {
        return restTemplate.getForObject(pythonServiceUrl + "/datasets", List.class);
    }

    /**
     * 3. CATEGORIE
     */
    public List<?> getCategories(String dataset) {
        String url = String.format("%s/%s/categories", pythonServiceUrl, dataset.toLowerCase());
        return restTemplate.getForObject(url, List.class);
    }

    /**
     * 3. ESPLORAZIONE DOMANDE
     */
    public List<?> getQuestions(String dataset, String category, int limit) {
        String url = String.format("%s/%s/category/%s/questions?limit=%d",
                pythonServiceUrl, dataset.toLowerCase(), category, limit);
        return restTemplate.getForObject(url, List.class);
    }

    /**
     * 4. CONFRONTO RISPOSTE
     */
    public Object getComparison(String dataset, String model, String category, int exampleId) {
        String url = String.format("%s/%s/comparison/%s/%s/%d",
                pythonServiceUrl, dataset.toLowerCase(), model.toLowerCase(), category, exampleId);
        return restTemplate.getForObject(url, Object.class);
    }
}