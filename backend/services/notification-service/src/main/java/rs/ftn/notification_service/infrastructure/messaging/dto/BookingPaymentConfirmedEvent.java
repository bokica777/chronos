package rs.ftn.notification_service.infrastructure.messaging.dto;

import java.time.LocalDateTime;
import java.util.UUID;

// serviceId/startTime/price mogu biti null za dogadjaje objavljene pre nego sto
// ih je booking-service poceo da salje - zato Double, a ne double.
public record BookingPaymentConfirmedEvent(
        UUID eventId,
        UUID bookingId,
        UUID customerId,
        UUID providerId,
        UUID serviceId,
        LocalDateTime startTime,
        Double price
) {
}
