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

// Sinhroni HTTP poziv ka auth-service-u (interni endpoint /internal/users/{id},
// nije izlozen kroz Gateway) - za customerId iz dogadjaja vraca ime, mejl i
// telefon kupca. Dogadjaji namerno nose samo customerId (ne licne podatke),
// pa ih notification-service dohvata tek kad mu zatrebaju za mejl.
@Component
public class AuthServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceClient.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
    private final JsonMapper jsonMapper;
    private final String baseUrl;
    private final String internalApiKey;

    public AuthServiceClient(
            JsonMapper jsonMapper,
            @Value("${auth-service.base-url}") String baseUrl,
            @Value("${auth-service.internal-api-key}") String internalApiKey) {
        this.jsonMapper = jsonMapper;
        this.baseUrl = baseUrl;
        this.internalApiKey = internalApiKey;
    }

    public UserContact findUser(UUID userId) {
        if (userId == null) {
            return null;
        }
        String url = baseUrl + "/internal/users/" + userId;
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .header("X-Internal-Key", internalApiKey)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("auth-service returned status {} for {}", response.statusCode(), url);
                return null;
            }
            return jsonMapper.readValue(response.body(), UserContact.class);
        } catch (Exception ex) {
            log.warn("Call to auth-service ({}) failed: {}", url, ex.getMessage());
            return null;
        }
    }

    public record UserContact(UUID id, String email, String displayName, String phoneNumber) {
    }
}
