package rs.ftn.notification_service.infrastructure.messaging.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record BookingCancelledEvent(
        UUID eventId,
        UUID bookingId,
        UUID customerId,
        double penaltyAmount,
        LocalDateTime cancelledAt
) {
}
