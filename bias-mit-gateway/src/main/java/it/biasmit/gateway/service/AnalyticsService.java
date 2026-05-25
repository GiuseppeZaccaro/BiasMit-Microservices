package it.biasmit.gateway.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;//classe nativa di Spring usata come client HTTP

@Service //dice a Spring che questa classe contiene la logica di business
public class AnalyticsService {
    //dichiarazione del client HTTP
    private final RestTemplate restTemplate;
    //dice a Spring di leggere i file di configurazione o le variabili d'ambiente Docker e cercare la chiave e iniettarne il valore
    @Value("${python.analytics.url}")
    private String analyticsServiceUrl; //iniezione del value

    //costruttore per inizializzare l'oggetto RestTemplate
    public AnalyticsService() {
        this.restTemplate = new RestTemplate();
    }

    public Object getModelAnalytics(String modelName) {
        //costruzione URL dinamico
        String url = String.format("%s/analytics/model/%s", analyticsServiceUrl, modelName.toLowerCase());
        //chiamata GET all'url costruito e mappa il json ricevuto da python in un oggetto Java
        return restTemplate.getForObject(url, Object.class);
    }

    public Object getComparisonAnalytics(String model) {
        String url = analyticsServiceUrl + "/analytics/comparison";
        if (model != null && !model.isBlank()) {//gestione filtro opzionale
            url += "?model=" + model.toLowerCase();
        }
        return restTemplate.getForObject(url, Object.class);
    }
}
