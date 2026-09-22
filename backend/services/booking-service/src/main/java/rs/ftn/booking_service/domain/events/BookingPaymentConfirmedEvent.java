package rs.ftn.booking_service.domain.events;

import java.time.LocalDateTime;
import java.util.UUID;

// serviceId/startTime/price su dodati da bi notification-service mogao da
// napise mejl sa detaljima rezervacije bez dodatnog poziva ka booking-service-u.
public record BookingPaymentConfirmedEvent(
        UUID eventId,
        UUID bookingId,
        UUID customerId,
        UUID providerId,
        UUID serviceId,
        LocalDateTime startTime,
        double price
) {
}
