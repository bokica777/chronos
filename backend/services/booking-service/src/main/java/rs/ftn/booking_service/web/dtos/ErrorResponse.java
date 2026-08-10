package rs.ftn.booking_service.web.dtos;

import java.time.LocalDateTime;

public record ErrorResponse(
        String message,
        int status,
        LocalDateTime timestamp
) {
}
