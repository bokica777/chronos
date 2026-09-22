package rs.ftn.notification_service.infrastructure.http;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

// Isti obrazac kao ProviderServiceClient u booking-service-u (sinhroni HTTP
// poziv ka provider-service-u preko postojeceg javnog GET /api/v1/providers/{id}
// endpoint-a) - ovde koristi se da bi se za dati providerId pronasao
// ContactEmail na koji treba poslati mejl obavestenje.
@Component
public class ProviderServiceClient {

    private static final Logger log = LoggerFactory.getLogger(ProviderServiceClient.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
    private final JsonMapper jsonMapper;
    private final String baseUrl;

    public ProviderServiceClient(
            JsonMapper jsonMapper,
            @Value("${provider-service.base-url}") String baseUrl) {
        this.jsonMapper = jsonMapper;
        this.baseUrl = baseUrl;
    }

    public ProviderLookup findProvider(UUID providerId) {
        if (providerId == null) {
            return null;
        }
        return get(baseUrl + "/api/v1/providers/" + providerId, ProviderLookup.class);
    }

    // Javni GET /api/v1/services/{id} - naziv i trajanje usluge za tekst mejla.
    public ServiceLookup findService(UUID serviceId) {
        if (serviceId == null) {
            return null;
        }
        return get(baseUrl + "/api/v1/services/" + serviceId, ServiceLookup.class);
    }

    private <T> T get(String url, Class<T> type) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("provider-service returned status {} for {}", response.statusCode(), url);
                return null;
            }
            return jsonMapper.readValue(response.body(), type);
        } catch (Exception ex) {
            log.warn("Call to provider-service ({}) failed: {}", url, ex.getMessage());
            return null;
        }
    }

    public record ProviderLookup(UUID id, String name, String contactEmail, String contactPhone,
                                 String address, boolean isActive) {
    }

    public record ServiceLookup(UUID id, String name, int durationMinutes) {
    }
}
