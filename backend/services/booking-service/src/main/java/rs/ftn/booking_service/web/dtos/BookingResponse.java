package rs.ftn.booking_service.web.dtos;

import rs.ftn.booking_service.domain.models.Booking;
import rs.ftn.booking_service.domain.models.BookingStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record BookingResponse(
        UUID id,
        UUID customerId,
        UUID providerId,
        UUID serviceId,
        LocalDateTime startTime,
        LocalDateTime endTime,
        BookingStatus status,
        double price,
        double penaltyAmount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static BookingResponse fromDomain(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getCustomerId(),
                booking.getProviderId(),
                booking.getServiceId(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getStatus(),
                booking.getPrice(),
                booking.getPenaltyAmount(),
                booking.getCreatedAt(),
                booking.getUpdatedAt()
        );
    }
}
