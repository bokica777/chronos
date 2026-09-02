package rs.ftn.booking_service.infrastructure.http;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import rs.ftn.booking_service.domain.exceptions.InvalidBookingException;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

/**
 * Samo za v2 (vidi booking.version u application.properties) - sinhrona
 * provera kod provider-service-a da provajder i usluga iz zahteva stvarno
 * postoje i da su aktivni, PRE nego sto se rezervacija potvrdi. v1 ovo
 * namerno ne radi (veruje frontu, kao sto je oduvek radio) - ova razlika je
 * bas ono sto Argo Rollouts canary rollout treba da demonstrira: v2 se
 * postepeno pusta na deo saobracaja, i ako ovaj dodatni poziv pravi probleme
 * (kasnjenje, provider-service nedostupan), to se vidi na malom procentu
 * pre nego sto se v2 promovise na sav saobracaj.
 */
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

    public void assertProviderAndServiceAreBookable(UUID providerId, UUID serviceId) {
        ProviderLookup provider = fetch(baseUrl + "/api/v1/providers/" + providerId, ProviderLookup.class);
        if (provider == null || !provider.isActive()) {
            throw new InvalidBookingException("Provajder " + providerId + " ne postoji ili nije aktivan.");
        }

        ServiceLookup service = fetch(baseUrl + "/api/v1/services/" + serviceId, ServiceLookup.class);
        if (service == null || !service.isActive()) {
            throw new InvalidBookingException("Usluga " + serviceId + " ne postoji ili nije aktivna.");
        }
        if (!service.providerId().equals(providerId)) {
            throw new InvalidBookingException("Usluga " + serviceId + " ne pripada provajderu " + providerId + ".");
        }
    }

    // Vraca null za 404 (ne postoji) - sve ostalo sto nije 200 OK, ili greska
    // u samoj mrezi/pozivu, tretira se kao neuspesna provera (InvalidBookingException).
    private <T> T fetch(String url, Class<T> type) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 404) {
                return null;
            }
            if (response.statusCode() != 200) {
                throw new InvalidBookingException(
                        "Provider-service je vratio neočekivan status " + response.statusCode() + " za " + url);
            }
            return jsonMapper.readValue(response.body(), type);
        } catch (InvalidBookingException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Poziv ka provider-service-u ({}) nije uspeo: {}", url, ex.getMessage());
            throw new InvalidBookingException("Provera kod provider-service-a nije uspela - pokušaj ponovo.");
        }
    }

    // Samo polja koja nam trebaju - Jackson ignoriše ostatak JSON odgovora
    // (isti obrazac kao BookingCreatedEvent/BookingCancelledEvent u notification-service).
    private record ProviderLookup(UUID id, boolean isActive) {
    }

    private record ServiceLookup(UUID id, UUID providerId, boolean isActive) {
    }
}
