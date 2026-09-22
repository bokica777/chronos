package rs.ftn.booking_service.domain.events;

import java.time.LocalDateTime;
import java.util.UUID;

public record BookingCreatedEvent(
        UUID eventId,
        UUID bookingId,
        UUID customerId,
        UUID providerId,
        UUID serviceId,
        LocalDateTime startTime,
        LocalDateTime endTime,
        double price
) {
}
