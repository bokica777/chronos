package rs.ftn.booking_service.infrastructure.messaging.dto;

import java.util.UUID;

public record PaymentCompletedEvent(
        UUID paymentId,
        UUID bookingId,
        UUID eventId
) {
}
