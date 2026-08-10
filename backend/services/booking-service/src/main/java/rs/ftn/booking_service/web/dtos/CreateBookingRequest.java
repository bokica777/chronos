package rs.ftn.booking_service.web.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDateTime;
import java.util.UUID;

public record CreateBookingRequest(
        @NotNull UUID customerId,
        @NotNull UUID providerId,
        @NotNull UUID serviceId,
        @NotNull LocalDateTime startTime,
        @NotNull LocalDateTime endTime,
        @PositiveOrZero double price,
        @NotBlank String idempotencyKey
) {
}
