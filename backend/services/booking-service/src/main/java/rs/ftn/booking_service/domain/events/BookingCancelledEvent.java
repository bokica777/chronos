package rs.ftn.booking_service.domain.events;

import java.time.LocalDateTime;
import java.util.UUID;

public record BookingCancelledEvent(
        UUID bookingId,
        UUID customerId,
        double penaltyAmount,
        LocalDateTime cancelledAt
) {
}
