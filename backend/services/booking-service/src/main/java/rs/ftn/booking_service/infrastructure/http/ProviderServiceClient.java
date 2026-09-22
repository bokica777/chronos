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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.UUID;

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
        fetchActiveProvider(providerId);

        ServiceLookup service = fetch(baseUrl + "/api/v1/services/" + serviceId, ServiceLookup.class);
        if (service == null || !service.isActive()) {
            throw new InvalidBookingException("Service " + serviceId + " does not exist or is not active.");
        }
        if (!service.providerId().equals(providerId)) {
            throw new InvalidBookingException("Service " + serviceId + " does not belong to provider " + providerId + ".");
        }
    }

    // v3-only provera: booking mora da upada u radno vreme provajdera. Ovo je
    // postojalo samo kao validacija na frontu (BookingForm) - v3 je prvi put
    // da se ista pravila primenjuju i na serveru, sto je jedina razlika u odnosu na v2.
    public void assertWithinWorkingHours(UUID providerId, LocalDateTime startTime, LocalDateTime endTime) {
        ProviderLookup provider = fetchActiveProvider(providerId);

        if (provider.workingHoursStart() == null || provider.workingHoursEnd() == null) {
            log.info("Provider {} has no working hours configured - skipping v3 working-hours check.", providerId);
            return;
        }

        LocalTime openTime;
        LocalTime closeTime;
        try {
            openTime = LocalTime.parse(provider.workingHoursStart());
            closeTime = LocalTime.parse(provider.workingHoursEnd());
        } catch (DateTimeParseException ex) {
            log.warn("Provider {} has malformed working hours ({} - {}) - skipping v3 working-hours check.",
                    providerId, provider.workingHoursStart(), provider.workingHoursEnd());
            return;
        }

        LocalTime bookingStart = startTime.toLocalTime();
        LocalTime bookingEnd = endTime.toLocalTime();
        if (bookingStart.isBefore(openTime) || bookingEnd.isAfter(closeTime)) {
            throw new InvalidBookingException(
                    "Requested time " + bookingStart + "-" + bookingEnd
                            + " is outside provider's working hours (" + openTime + "-" + closeTime + ").");
        }
    }

    private ProviderLookup fetchActiveProvider(UUID providerId) {
        ProviderLookup provider = fetch(baseUrl + "/api/v1/providers/" + providerId, ProviderLookup.class);
        if (provider == null || !provider.isActive()) {
            throw new InvalidBookingException("Provider " + providerId + " does not exist or is not active.");
        }
        return provider;
    }

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
                        "provider-service returned an unexpected status " + response.statusCode() + " for " + url);
            }
            return jsonMapper.readValue(response.body(), type);
        } catch (InvalidBookingException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Call to provider-service ({}) failed: {}", url, ex.getMessage());
            throw new InvalidBookingException("Check against provider-service failed - please try again.");
        }
    }

    private record ProviderLookup(UUID id, boolean isActive, String workingHoursStart, String workingHoursEnd) {
    }

    private record ServiceLookup(UUID id, UUID providerId, boolean isActive) {
    }
}
