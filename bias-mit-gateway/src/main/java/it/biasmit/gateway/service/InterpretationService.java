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

    public Object analyze(Object requestBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Object> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<Object> response = restTemplate.exchange(
            interpretationServiceUrl + "/analyze",
            HttpMethod.POST,
            entity,
            Object.class
        );
        return response.getBody();
    }
}
