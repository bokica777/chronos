package rs.ftn.booking_service.domain.exceptions;

public class BookingOverlapException extends DomainException {

    public BookingOverlapException() {
        super("Provider already has an overlapping booking for that time slot");
    }
}
