package rs.ftn.booking_service.application.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rs.ftn.booking_service.domain.events.BookingCancelledEvent;
import rs.ftn.booking_service.domain.events.BookingCreatedEvent;
import rs.ftn.booking_service.domain.events.BookingPaymentConfirmedEvent;
import rs.ftn.booking_service.domain.exceptions.BookingNotFoundException;
import rs.ftn.booking_service.domain.exceptions.BookingOverlapException;
import rs.ftn.booking_service.domain.exceptions.DuplicateBookingException;
import rs.ftn.booking_service.domain.exceptions.InvalidBookingStateException;
import rs.ftn.booking_service.domain.loyalty.LoyaltyStatus;
import rs.ftn.booking_service.domain.models.Booking;
import rs.ftn.booking_service.domain.models.BookingStatus;
import rs.ftn.booking_service.domain.models.OutboxMessage;
import rs.ftn.booking_service.domain.repositories.BookingRepository;
import rs.ftn.booking_service.domain.repositories.OutboxMessageRepository;
import rs.ftn.booking_service.infrastructure.http.ProviderServiceClient;
import rs.ftn.booking_service.web.dtos.CreateBookingRequest;
import tools.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class BookingServiceImpl implements BookingService {

    private static final double LATE_CANCELLATION_PENALTY_RATE = 0.5;
    private static final long LATE_CANCELLATION_THRESHOLD_HOURS = 24;
    private static final String BOOKING_VERSION_V2 = "v2";
    private static final String BOOKING_VERSION_V3 = "v3";

    private final BookingRepository bookingRepository;
    private final OutboxMessageRepository outboxMessageRepository;
    private final JsonMapper jsonMapper;
    private final ProviderServiceClient providerServiceClient;
    private final String bookingVersion;
    private static final Logger log = LoggerFactory.getLogger(BookingServiceImpl.class);

    public BookingServiceImpl(BookingRepository bookingRepository,
                               OutboxMessageRepository outboxMessageRepository,
                               JsonMapper jsonMapper,
                               ProviderServiceClient providerServiceClient,
                               @Value("${booking.version}") String bookingVersion) {
        this.bookingRepository = bookingRepository;
        this.outboxMessageRepository = outboxMessageRepository;
        this.jsonMapper = jsonMapper;
        this.providerServiceClient = providerServiceClient;
        this.bookingVersion = bookingVersion;
    }

    @Override
    @Transactional
    public Booking createBooking(CreateBookingRequest request, UUID customerId) {
        log.info("Creating booking for customer {} and provider {}", customerId, request.providerId());

        if (bookingRepository.existsByIdempotencyKey(request.idempotencyKey())) {
            log.warn("Duplicate booking rejected for idempotencyKey {}", request.idempotencyKey());
            throw new DuplicateBookingException(request.idempotencyKey());
        }

        boolean isV2OrHigher = BOOKING_VERSION_V2.equalsIgnoreCase(bookingVersion)
                || BOOKING_VERSION_V3.equalsIgnoreCase(bookingVersion);
        if (isV2OrHigher) {
            providerServiceClient.assertProviderAndServiceAreBookable(request.providerId(), request.serviceId());
        }

        if (BOOKING_VERSION_V3.equalsIgnoreCase(bookingVersion)) {
            providerServiceClient.assertWithinWorkingHours(request.providerId(), request.startTime(), request.endTime());
        }

        List<Booking> overlapping = bookingRepository.findOverlapping(
                request.providerId(), request.startTime(), request.endTime()
        );
        if (!overlapping.isEmpty()) {
            log.warn("Overlapping booking rejected for provider {}", request.providerId());
            throw new BookingOverlapException();
        }

        // Popust iz kartice lojalnosti se primenjuje ovde, na serveru - cena koju
        // posalje frontend je uvek puna cena usluge.
        LoyaltyStatus loyalty = getLoyalty(customerId);
        double finalPrice = loyalty.applyDiscount(request.price());
        if (loyalty.discountPercent() > 0) {
            log.info("Applying {}% loyalty discount for customer {} ({} -> {})",
                    loyalty.discountPercent(), customerId, request.price(), finalPrice);
        }

        Booking booking = new Booking(
                customerId,
                request.providerId(),
                request.serviceId(),
                request.startTime(),
                request.endTime(),
                finalPrice,
                request.idempotencyKey()
        );
        Booking saved = bookingRepository.save(booking);

        UUID eventId = UUID.randomUUID();
        BookingCreatedEvent event = new BookingCreatedEvent(
                eventId,
                saved.getId(),
                saved.getCustomerId(),
                saved.getProviderId(),
                saved.getServiceId(),
                saved.getStartTime(),
                saved.getEndTime(),
                saved.getPrice()
        );
        String payload = jsonMapper.writeValueAsString(event);
        outboxMessageRepository.save(new OutboxMessage(saved.getId(), "BookingCreated", payload));

        log.info("Booking {} created successfully", saved.getId());
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Booking getBookingForCustomer(UUID bookingId, UUID customerId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));
        if (!booking.getCustomerId().equals(customerId)) {
            throw new BookingNotFoundException(bookingId);
        }
        return booking;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Booking> listByCustomer(UUID customerId) {
        return bookingRepository.findByCustomerId(customerId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Booking> listByProvider(UUID providerId) {
        return bookingRepository.findByProviderIdAndStatusNot(providerId, BookingStatus.CANCELLED);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Booking> listAll() {
        return bookingRepository.findAll();
    }

    @Override
    @Transactional
    public Booking cancelBookingForCustomer(UUID bookingId, UUID customerId) {
        log.info("Cancelling booking {}", bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));
        if (!booking.getCustomerId().equals(customerId)) {
            throw new BookingNotFoundException(bookingId);
        }
        cancel(booking);

        UUID eventId = UUID.randomUUID();
        BookingCancelledEvent event = new BookingCancelledEvent(
                eventId,
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

    @Override
    @Transactional
    public void confirmPayment(UUID bookingId, UUID eventId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            log.warn("Received payment confirmation for unknown booking {}", bookingId);
            return;
        }

        BookingPaymentConfirmedEvent event = new BookingPaymentConfirmedEvent(
                eventId, booking.getId(), booking.getCustomerId(), booking.getProviderId(),
                booking.getServiceId(), booking.getStartTime(), booking.getPrice());
        String payload = jsonMapper.writeValueAsString(event);
        outboxMessageRepository.save(new OutboxMessage(booking.getId(), "BookingPaymentConfirmed", payload));

        log.info("Payment confirmed for booking {}", booking.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public LoyaltyStatus getLoyalty(UUID customerId) {
        LocalDateTime now = LocalDateTime.now();
        int stamps = (int) bookingRepository.findByCustomerId(customerId).stream()
                .filter(booking -> booking.getStatus() != BookingStatus.CANCELLED)
                .filter(booking -> booking.getEndTime().isBefore(now))
                .count();
        return LoyaltyStatus.forStamps(stamps);
    }

    private void cancel(Booking booking) {
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new InvalidBookingStateException("Booking is already cancelled");
        }

        LocalDateTime now = LocalDateTime.now();
        long hoursUntilStart = Duration.between(now, booking.getStartTime()).toHours();
        double penaltyAmount = hoursUntilStart < LATE_CANCELLATION_THRESHOLD_HOURS
                ? booking.getPrice() * LATE_CANCELLATION_PENALTY_RATE
                : 0.0;

        booking.setPenaltyAmount(penaltyAmount);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setUpdatedAt(now);
    }
}
