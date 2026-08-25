package rs.ftn.notification_service.infrastructure.messaging.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lokalna kopija ugovora poruke koju objavljuje booking-service
 * (rs.ftn.booking_service.domain.events.BookingCreatedEvent). Servisi ne dele kod
 * medju sobom - samo se oslanjaju na isti JSON oblik poruke na RabbitMQ-u.
 */
public record BookingCreatedEvent(
        UUID bookingId,
        UUID customerId,
        UUID providerId,
        LocalDateTime startTime,
        double price
) {
}
