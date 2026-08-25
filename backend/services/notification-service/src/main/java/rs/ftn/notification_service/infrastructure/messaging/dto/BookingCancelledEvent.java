package rs.ftn.notification_service.infrastructure.messaging.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lokalna kopija ugovora poruke koju objavljuje booking-service
 * (rs.ftn.booking_service.domain.events.BookingCancelledEvent).
 */
public record BookingCancelledEvent(
        UUID bookingId,
        UUID customerId,
        double penaltyAmount,
        LocalDateTime cancelledAt
) {
}
