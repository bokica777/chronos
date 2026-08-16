package rs.ftn.booking_service.web.controllers;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody CreateBookingRequest request,
                                                           @AuthenticationPrincipal Jwt jwt){
        Booking booking = bookingService.createBooking(request, currentUserId(jwt));
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(booking.getId())
                .toUri();
        return ResponseEntity.created(location).body(BookingResponse.fromDomain(booking));
    }

    @GetMapping("/{id}")
    public BookingResponse getBooking(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt){
        Booking booking = bookingService.getBookingForCustomer(id, currentUserId(jwt));
        return BookingResponse.fromDomain(booking);
    }

    // Rezervacije ulogovanog korisnika - customerId dolazi iz tokena, ne iz query parametra.
    @GetMapping("/me")
    public List<BookingResponse> listMine(@AuthenticationPrincipal Jwt jwt) {
        List<Booking> bookings = bookingService.listByCustomer(currentUserId(jwt));
        List<BookingResponse> responses = new ArrayList<>();
        for (Booking booking : bookings) {
            responses.add(BookingResponse.fromDomain(booking));
        }
        return responses;
    }

    // Ostaje javno (bez prijave) - koristi se za prikaz kalendara dostupnosti gostima.
    @GetMapping("/provider/{providerId}")
    public List<BookingResponse> listByProvider(@PathVariable UUID providerId) {
        List<Booking> bookings = bookingService.listByProvider(providerId);
        List<BookingResponse> responses = new ArrayList<>();
        for (Booking booking : bookings) {
            responses.add(BookingResponse.fromDomain(booking));
        }
        return responses;
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancelBooking(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        Booking booking = bookingService.cancelBookingForCustomer(id, currentUserId(jwt));
        return BookingResponse.fromDomain(booking);
    }

    // "sub" claim iz JWT-a je id ulogovanog korisnika - customerId se nikad ne uzima sa fronta.
    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
