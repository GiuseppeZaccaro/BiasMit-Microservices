package it.biasmit.gateway.controller;

import it.biasmit.gateway.model.Bookmark;
import it.biasmit.gateway.repository.BookmarkRepository;
import it.biasmit.gateway.service.AnalyticsService;
import it.biasmit.gateway.service.InferenceService;
import it.biasmit.gateway.service.InterpretationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gateway")
@CrossOrigin(origins = "*") // Necessario per permettere la comunicazione con il Frontend
public class GatewayController {

    private final InferenceService inferenceService;
    private final BookmarkRepository bookmarkRepository;
    private final AnalyticsService analyticsService;
    private final InterpretationService interpretationService;

    public GatewayController(InferenceService inferenceService,
                             BookmarkRepository bookmarkRepository,
                             AnalyticsService analyticsService,
                             InterpretationService interpretationService) {
        this.inferenceService = inferenceService;
        this.bookmarkRepository = bookmarkRepository;
        this.analyticsService = analyticsService;
        this.interpretationService = interpretationService;
    }

    // --- SEZIONE 1: REPORT STATISTICI (.txt) ---
    // Endpoint per leggere i file report_*.txt dalla cartella stats/mistral/
    @GetMapping("/reports/{model}/{method}")//ResponseEntity<?> è un contenitore flessibile che permette di restituire i dati + il codice di stato HTTP
    public ResponseEntity<?> getReport(@PathVariable String model, @PathVariable String method) {//pathvariable dice a Spring di prendere il valore dell'URL in una variabile Java
        try {
            Object report = inferenceService.getModelMethodReport(model, method);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.status(404).body("Errore nel recupero del report: " + e.getMessage());
        }
    }

    // --- SEZIONE 1b: REGISTRY (modelli e dataset dinamici) ---
    @GetMapping("/models")
    public ResponseEntity<?> getModels() {
        try {
            return ResponseEntity.ok(inferenceService.getModels());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Errore recupero modelli: " + e.getMessage());
        }
    }

    @GetMapping("/datasets")
    public ResponseEntity<?> getDatasets() {
        try {
            return ResponseEntity.ok(inferenceService.getDatasets());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Errore recupero dataset: " + e.getMessage());
        }
    }

    // --- SEZIONE 2: ESPLORAZIONE DATASET (JSONL/ARROW) ---
    // Recupera le categorie disponibili per BBQ o StereoSet
    @GetMapping("/categories/{dataset}")
    public ResponseEntity<?> getCategories(@PathVariable String dataset) {
        return ResponseEntity.ok(inferenceService.getCategories(dataset));
    }

    // Recupera la lista dei prompt originali di una categoria
    @GetMapping("/explore/{dataset}/{category}")
    public ResponseEntity<?> explore(@PathVariable String dataset,
                                     @PathVariable String category,
                                     @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(inferenceService.getQuestions(dataset, category, limit));
    }

    // Recupera il confronto tra le risposte dei 4 metodi per un prompt specifico
    @GetMapping("/compare/{dataset}/{model}/{category}/{id}")
    public ResponseEntity<?> compare(@PathVariable String dataset,
                                     @PathVariable String model,
                                     @PathVariable String category,
                                     @PathVariable int id) {
        return ResponseEntity.ok(inferenceService.getComparison(dataset, model, category, id));
    }

    // --- SEZIONE 3: ANALYTICS (Proxy verso ai-analytics-service) ---
    @GetMapping("/analytics/model/{model}")
    public ResponseEntity<?> getModelAnalytics(@PathVariable String model) {
        try {
            return ResponseEntity.ok(analyticsService.getModelAnalytics(model));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Errore analytics: " + e.getMessage());
        }
    }

    @GetMapping("/analytics/comparison")
    public ResponseEntity<?> getComparisonAnalytics(
            @RequestParam(required = false) String model) {
        try {
            return ResponseEntity.ok(analyticsService.getComparisonAnalytics(model));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Errore analytics: " + e.getMessage());
        }
    }

    // --- SEZIONE 3b: INTERPRETAZIONE LLM ---
    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody Object requestBody) {
        try {
            return ResponseEntity.ok(interpretationService.analyze(requestBody));
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            // Propagate status + original JSON body (includes FastAPI "detail" field)
            return ResponseEntity.status(e.getStatusCode())
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(503).body("{\"detail\": \"Servizio di interpretazione non raggiungibile.\"}");
        }
    }

    // --- SEZIONE 4: GESTIONE PREFERITI (PostgreSQL) ---
    // Salva un prompt e una risposta specifica nel database (idempotente: restituisce l'esistente se già salvato)
    @PostMapping("/bookmarks")//@RequestBody trasforma il Json del frontend in un oggetto java di tipo bookmark
    public ResponseEntity<Bookmark> saveBookmark(@RequestBody Bookmark bookmark) {
        return bookmarkRepository
            .findByDatasetAndModelNameAndCategoryAndExampleId(
                bookmark.getDataset(), bookmark.getModelName(),
                bookmark.getCategory(), bookmark.getExampleId())
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.ok(bookmarkRepository.save(bookmark)));
    }

    // Recupera tutti i preferiti salvati
    @GetMapping("/bookmarks")
    public ResponseEntity<List<Bookmark>> getAllBookmarks() {
        return ResponseEntity.ok(bookmarkRepository.findAll());
    }

    // Rimuove un preferito dal database
    @DeleteMapping("/bookmarks/{id}")
    public ResponseEntity<Void> deleteBookmark(@PathVariable Long id) {
        if (bookmarkRepository.existsById(id)) {
            bookmarkRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}