package it.biasmit.gateway.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AnalyticsService {

    private final RestTemplate restTemplate;

    @Value("${python.analytics.url}")
    private String analyticsServiceUrl;

    public AnalyticsService() {
        this.restTemplate = new RestTemplate();
    }

    public Object getModelAnalytics(String modelName) {
        String url = String.format("%s/analytics/model/%s", analyticsServiceUrl, modelName.toLowerCase());
        return restTemplate.getForObject(url, Object.class);
    }

    public Object getComparisonAnalytics(String model) {
        String url = analyticsServiceUrl + "/analytics/comparison";
        if (model != null && !model.isBlank()) {
            url += "?model=" + model.toLowerCase();
        }
        return restTemplate.getForObject(url, Object.class);
    }
}
