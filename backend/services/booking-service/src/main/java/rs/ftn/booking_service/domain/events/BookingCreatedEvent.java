package rs.ftn.booking_service.domain.events;

import java.time.LocalDateTime;
import java.util.UUID;

public record BookingCreatedEvent(
        UUID bookingId,
        UUID customerId,
        UUID providerId,
        LocalDateTime startTime,
        double price
) {
}
