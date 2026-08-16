package rs.ftn.booking_service.web.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDateTime;
import java.util.UUID;

// customerId namerno NIJE polje ovde - uvek se uzima iz JWT "sub" claim-a
// ulogovanog korisnika (BookingController), nikad se ne veruje klijentu.
public record CreateBookingRequest(
        @NotNull UUID providerId,
        @NotNull UUID serviceId,
        @NotNull LocalDateTime startTime,
        @NotNull LocalDateTime endTime,
        @PositiveOrZero double price,
        @NotBlank String idempotencyKey
) {
}
