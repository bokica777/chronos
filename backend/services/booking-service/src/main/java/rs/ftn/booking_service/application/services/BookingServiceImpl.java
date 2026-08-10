package rs.ftn.booking_service.application.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rs.ftn.booking_service.domain.events.BookingCancelledEvent;
import rs.ftn.booking_service.domain.events.BookingCreatedEvent;
import rs.ftn.booking_service.domain.exceptions.BookingNotFoundException;
import rs.ftn.booking_service.domain.exceptions.BookingOverlapException;
import rs.ftn.booking_service.domain.exceptions.DuplicateBookingException;
import rs.ftn.booking_service.domain.models.Booking;
import rs.ftn.booking_service.domain.models.OutboxMessage;
import rs.ftn.booking_service.domain.repositories.BookingRepository;
import rs.ftn.booking_service.domain.repositories.OutboxMessageRepository;
import rs.ftn.booking_service.web.dtos.CreateBookingRequest;
import tools.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.UUID;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final OutboxMessageRepository outboxMessageRepository;
    private final JsonMapper jsonMapper;
    private static final Logger log = LoggerFactory.getLogger(BookingServiceImpl.class);

    public BookingServiceImpl(BookingRepository bookingRepository,
                               OutboxMessageRepository outboxMessageRepository,
                               JsonMapper jsonMapper) {
        this.bookingRepository = bookingRepository;
        this.outboxMessageRepository = outboxMessageRepository;
        this.jsonMapper = jsonMapper;
    }

    @Override
    @Transactional
    public Booking createBooking(CreateBookingRequest request) {
        log.info("Creating booking for customer {} and provider {}", request.customerId(), request.providerId());

        if (bookingRepository.existsByIdempotencyKey(request.idempotencyKey())) {
            log.warn("Duplicate booking rejected for idempotencyKey {}", request.idempotencyKey());
            throw new DuplicateBookingException(request.idempotencyKey());
        }

        List<Booking> overlapping = bookingRepository.findOverlapping(
                request.providerId(), request.startTime(), request.endTime()
        );
        if (!overlapping.isEmpty()) {
            log.warn("Overlapping booking rejected for provider {}", request.providerId());
            throw new BookingOverlapException();
        }

        Booking booking = new Booking(
                request.customerId(),
                request.providerId(),
                request.serviceId(),
                request.startTime(),
                request.endTime(),
                request.price(),
                request.idempotencyKey()
        );
        Booking saved = bookingRepository.save(booking);

        BookingCreatedEvent event = new BookingCreatedEvent(
                saved.getId(),
                saved.getCustomerId(),
                saved.getProviderId(),
                saved.getStartTime(),
                saved.getPrice()
        );
        String payload = jsonMapper.writeValueAsString(event);
        outboxMessageRepository.save(new OutboxMessage(saved.getId(), "BookingCreated", payload));

        log.info("Booking {} created successfully", saved.getId());
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Booking getBooking(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Booking> listByCustomer(UUID customerId) {
        return bookingRepository.findByCustomerId(customerId);
    }

    @Override
    @Transactional
    public Booking cancelBooking(UUID bookingId) {
        log.info("Cancelling booking {}", bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));
        booking.cancel();

        BookingCancelledEvent event = new BookingCancelledEvent(
                booking.getId(),
                booking.getCustomerId(),
                booking.getPenaltyAmount(),
                booking.getUpdatedAt()
        );
        String payload = jsonMapper.writeValueAsString(event);
        outboxMessageRepository.save(new OutboxMessage(booking.getId(), "BookingCancelled", payload));

        log.info("Booking {} cancelled, penalty amount {}", booking.getId(), booking.getPenaltyAmount());

        return booking;
    }
}
