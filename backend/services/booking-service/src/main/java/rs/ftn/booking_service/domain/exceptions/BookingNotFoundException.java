package rs.ftn.booking_service.domain.exceptions;

import java.util.UUID;

public class BookingNotFoundException extends DomainException {

    public BookingNotFoundException(UUID bookingId) {
        super("Booking with id " + bookingId + " does not exist");
    }
}
