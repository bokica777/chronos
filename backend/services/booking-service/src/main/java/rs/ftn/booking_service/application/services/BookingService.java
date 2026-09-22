package rs.ftn.booking_service.application.services;

import rs.ftn.booking_service.domain.loyalty.LoyaltyStatus;
import rs.ftn.booking_service.domain.models.Booking;
import rs.ftn.booking_service.web.dtos.CreateBookingRequest;

import java.util.List;
import java.util.UUID;

public interface BookingService {

    Booking createBooking(CreateBookingRequest request, UUID customerId);

    Booking getBookingForCustomer(UUID bookingId, UUID customerId);

    List<Booking> listByCustomer(UUID customerId);

    List<Booking> listByProvider(UUID providerId);

    List<Booking> listAll();

    Booking cancelBookingForCustomer(UUID bookingId, UUID customerId);

    void confirmPayment(UUID bookingId, UUID eventId);

    LoyaltyStatus getLoyalty(UUID customerId);
}
