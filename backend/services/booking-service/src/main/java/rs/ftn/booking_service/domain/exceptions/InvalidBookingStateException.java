package rs.ftn.booking_service.domain.exceptions;

public class InvalidBookingStateException extends DomainException {

    public InvalidBookingStateException(String message) {
        super(message);
    }
}
