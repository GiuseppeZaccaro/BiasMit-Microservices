package it.biasmit.gateway.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class InterpretationService {

    private final RestTemplate restTemplate;

    @Value("${python.interpretation.url}")
    private String interpretationServiceUrl;

    public InterpretationService() {
        this.restTemplate = new RestTemplate();
    }

    public Object analyze(Object requestBody) {//prende l'oggetto inviato da React e lo spedisce verso l'endpoint
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);//creazione header
        HttpEntity<Object> entity = new HttpEntity<>(requestBody, headers);//unisce il json e l'header in un unico pacchetto
        ResponseEntity<Object> response = restTemplate.exchange(
            interpretationServiceUrl + "/analyze",
            HttpMethod.POST,
            entity,
            Object.class
        );
        return response.getBody();//estrae il contenuto della risposta e lo restituisce al controller
    }
}
