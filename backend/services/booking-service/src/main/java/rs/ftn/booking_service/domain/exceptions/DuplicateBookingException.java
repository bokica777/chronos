package rs.ftn.booking_service.domain.exceptions;

public class DuplicateBookingException extends DomainException {

    public DuplicateBookingException(String idempotencyKey) {
        super("Booking with idempotency key '" + idempotencyKey + "' already exists");
    }
}
