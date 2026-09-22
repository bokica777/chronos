package rs.ftn.booking_service.application.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import rs.ftn.booking_service.domain.exceptions.BookingNotFoundException;
import rs.ftn.booking_service.domain.exceptions.BookingOverlapException;
import rs.ftn.booking_service.domain.exceptions.DuplicateBookingException;
import rs.ftn.booking_service.domain.exceptions.InvalidBookingStateException;
import rs.ftn.booking_service.domain.models.Booking;
import rs.ftn.booking_service.domain.models.BookingStatus;
import rs.ftn.booking_service.domain.repositories.BookingRepository;
import rs.ftn.booking_service.domain.repositories.OutboxMessageRepository;
import rs.ftn.booking_service.infrastructure.http.ProviderServiceClient;
import rs.ftn.booking_service.web.dtos.CreateBookingRequest;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceImplTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private OutboxMessageRepository outboxMessageRepository;
    @Mock
    private JsonMapper jsonMapper;
    @Mock
    private ProviderServiceClient providerServiceClient;

    private final UUID customerId = UUID.randomUUID();
    private final UUID providerId = UUID.randomUUID();
    private final UUID serviceId = UUID.randomUUID();

    private CreateBookingRequest request;

    @BeforeEach
    void setUp() {
        LocalDateTime startTime = LocalDateTime.now().plusDays(2);
        request = new CreateBookingRequest(providerId, serviceId, startTime, startTime.plusMinutes(30), 1000, "key-1");
    }

    private BookingServiceImpl serviceWithVersion(String version) {
        return new BookingServiceImpl(bookingRepository, outboxMessageRepository, jsonMapper, providerServiceClient, version);
    }

    @Test
    void createBooking_v1_doesNotCallProviderServiceClient() {
        when(bookingRepository.existsByIdempotencyKey("key-1")).thenReturn(false);
        when(bookingRepository.findOverlapping(any(), any(), any())).thenReturn(List.of());
        when(bookingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(jsonMapper.writeValueAsString(any())).thenReturn("{}");

        serviceWithVersion("v1").createBooking(request, customerId);

        verifyNoInteractions(providerServiceClient);
    }

    @Test
    void createBooking_v2_callsProviderServiceClient() {
        when(bookingRepository.existsByIdempotencyKey("key-1")).thenReturn(false);
        when(bookingRepository.findOverlapping(any(), any(), any())).thenReturn(List.of());
        when(bookingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(jsonMapper.writeValueAsString(any())).thenReturn("{}");

        serviceWithVersion("v2").createBooking(request, customerId);

        verify(providerServiceClient).assertProviderAndServiceAreBookable(providerId, serviceId);
    }

    @Test
    void createBooking_duplicateIdempotencyKey_throwsAndSkipsProviderCheck() {
        when(bookingRepository.existsByIdempotencyKey("key-1")).thenReturn(true);

        assertThatThrownBy(() -> serviceWithVersion("v2").createBooking(request, customerId))
                .isInstanceOf(DuplicateBookingException.class);

        verifyNoInteractions(providerServiceClient);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void createBooking_overlappingBooking_throws() {
        when(bookingRepository.existsByIdempotencyKey("key-1")).thenReturn(false);
        when(bookingRepository.findOverlapping(any(), any(), any()))
                .thenReturn(List.of(mock(Booking.class)));

        assertThatThrownBy(() -> serviceWithVersion("v1").createBooking(request, customerId))
                .isInstanceOf(BookingOverlapException.class);

        verify(bookingRepository, never()).save(any());
    }

    @Test
    void cancelBookingForCustomer_lessThan24hBeforeStart_appliesFiftyPercentPenalty() {
        Booking booking = new Booking(customerId, providerId, serviceId,
                LocalDateTime.now().plusHours(2), LocalDateTime.now().plusHours(2).plusMinutes(30),
                1000, "key-1");
        UUID bookingId = UUID.randomUUID();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(jsonMapper.writeValueAsString(any())).thenReturn("{}");

        Booking cancelled = serviceWithVersion("v1").cancelBookingForCustomer(bookingId, customerId);

        assertThat(cancelled.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(cancelled.getPenaltyAmount()).isEqualTo(500.0);
    }

    @Test
    void cancelBookingForCustomer_moreThan24hBeforeStart_noPenalty() {
        Booking booking = new Booking(customerId, providerId, serviceId,
                LocalDateTime.now().plusDays(3), LocalDateTime.now().plusDays(3).plusMinutes(30),
                1000, "key-1");
        UUID bookingId = UUID.randomUUID();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(jsonMapper.writeValueAsString(any())).thenReturn("{}");

        Booking cancelled = serviceWithVersion("v1").cancelBookingForCustomer(bookingId, customerId);

        assertThat(cancelled.getPenaltyAmount()).isZero();
    }

    @Test
    void cancelBookingForCustomer_alreadyCancelled_throws() {
        Booking booking = new Booking(customerId, providerId, serviceId,
                LocalDateTime.now().plusDays(3), LocalDateTime.now().plusDays(3).plusMinutes(30),
                1000, "key-1");
        booking.setStatus(BookingStatus.CANCELLED);
        UUID bookingId = UUID.randomUUID();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> serviceWithVersion("v1").cancelBookingForCustomer(bookingId, customerId))
                .isInstanceOf(InvalidBookingStateException.class);
    }

    @Test
    void cancelBookingForCustomer_wrongCustomer_throwsNotFound() {
        Booking booking = new Booking(customerId, providerId, serviceId,
                LocalDateTime.now().plusDays(3), LocalDateTime.now().plusDays(3).plusMinutes(30),
                1000, "key-1");
        UUID bookingId = UUID.randomUUID();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> serviceWithVersion("v1").cancelBookingForCustomer(bookingId, UUID.randomUUID()))
                .isInstanceOf(BookingNotFoundException.class);
    }

    @Test
    void getBookingForCustomer_wrongCustomer_throwsNotFound() {
        Booking booking = new Booking(customerId, providerId, serviceId,
                LocalDateTime.now().plusDays(3), LocalDateTime.now().plusDays(3).plusMinutes(30),
                1000, "key-1");
        UUID bookingId = UUID.randomUUID();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> serviceWithVersion("v1").getBookingForCustomer(bookingId, UUID.randomUUID()))
                .isInstanceOf(BookingNotFoundException.class);
    }
}
