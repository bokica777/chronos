package rs.ftn.booking_service.application.services;

import rs.ftn.booking_service.domain.models.Booking;
import rs.ftn.booking_service.web.dtos.CreateBookingRequest;

import java.util.List;
import java.util.UUID;

public interface BookingService {

    Booking createBooking(CreateBookingRequest request, UUID customerId);

    // Vraca rezervaciju samo ako pripada datom customerId-ju, inace baca
    // BookingNotFoundException (404, ne 403 - ne otkrivamo da li rezervacija
    // uopste postoji nekom ko nije njen vlasnik).
    Booking getBookingForCustomer(UUID bookingId, UUID customerId);

    List<Booking> listByCustomer(UUID customerId);

    List<Booking> listByProvider(UUID providerId);

    Booking cancelBookingForCustomer(UUID bookingId, UUID customerId);
}
