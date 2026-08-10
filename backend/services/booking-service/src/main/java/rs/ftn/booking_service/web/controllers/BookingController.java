package rs.ftn.booking_service.web.controllers;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import rs.ftn.booking_service.application.services.BookingService;
import rs.ftn.booking_service.domain.models.Booking;
import rs.ftn.booking_service.web.dtos.BookingResponse;
import rs.ftn.booking_service.web.dtos.CreateBookingRequest;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService){
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody CreateBookingRequest request){
        Booking booking = bookingService.createBooking(request);
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(booking.getId())
                .toUri();
        return ResponseEntity.created(location).body(BookingResponse.fromDomain(booking));
    }
    @GetMapping("/{id}")
    public BookingResponse getBooking(@PathVariable UUID id){
        Booking booking = bookingService.getBooking(id);
        return BookingResponse.fromDomain(booking);
    }

    @GetMapping
    public List<BookingResponse> listByCustomer(@RequestParam UUID customerId) {
        List<Booking> bookings = bookingService.listByCustomer(customerId);
        List<BookingResponse> responses = new ArrayList<>();
        for (Booking booking : bookings) {
            responses.add(BookingResponse.fromDomain(booking));
        }
        return responses;
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancelBooking(@PathVariable UUID id) {
        Booking booking = bookingService.cancelBooking(id);
        return BookingResponse.fromDomain(booking);
    }
}

