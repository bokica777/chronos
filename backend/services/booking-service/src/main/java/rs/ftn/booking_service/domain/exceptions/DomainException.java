package rs.ftn.booking_service.domain.exceptions;

public abstract class DomainException extends RuntimeException {

    protected DomainException(String message) {
        super(message);
    }
}
