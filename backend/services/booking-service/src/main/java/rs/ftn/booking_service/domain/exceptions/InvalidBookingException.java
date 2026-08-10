package rs.ftn.booking_service.domain.exceptions;

public class InvalidBookingException extends DomainException {

    public InvalidBookingException(String message) {
        super(message);
    }
}
