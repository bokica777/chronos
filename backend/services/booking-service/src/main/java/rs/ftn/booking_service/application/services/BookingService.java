package rs.ftn.booking_service.application.services;

import rs.ftn.booking_service.domain.models.Booking;
import rs.ftn.booking_service.web.dtos.CreateBookingRequest;

import java.util.List;
import java.util.UUID;

public interface BookingService {

    Booking createBooking(CreateBookingRequest request);

    Booking getBooking(UUID bookingId);

    List<Booking> listByCustomer(UUID customerId);

    Booking cancelBooking(UUID bookingId);
}
