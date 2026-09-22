package rs.ftn.booking_service.domain.models;

import org.junit.jupiter.api.Test;
import rs.ftn.booking_service.domain.exceptions.InvalidBookingException;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BookingTest {

    private final UUID customerId = UUID.randomUUID();
    private final UUID providerId = UUID.randomUUID();
    private final UUID serviceId = UUID.randomUUID();
    private final LocalDateTime startTime = LocalDateTime.now().plusDays(1);
    private final LocalDateTime endTime = startTime.plusMinutes(30);

    @Test
    void constructor_withValidData_createsPendingBookingWithNoPenalty() {
        Booking booking = new Booking(customerId, providerId, serviceId, startTime, endTime, 1000, "key-1");

        assertThat(booking.getCustomerId()).isEqualTo(customerId);
        assertThat(booking.getProviderId()).isEqualTo(providerId);
        assertThat(booking.getServiceId()).isEqualTo(serviceId);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING);
        assertThat(booking.getPenaltyAmount()).isZero();
        assertThat(booking.getPrice()).isEqualTo(1000);
    }

    @Test
    void constructor_withNullCustomerId_throws() {
        assertThatThrownBy(() -> new Booking(null, providerId, serviceId, startTime, endTime, 1000, "key-1"))
                .isInstanceOf(InvalidBookingException.class);
    }

    @Test
    void constructor_withEndTimeNotAfterStartTime_throws() {
        assertThatThrownBy(() -> new Booking(customerId, providerId, serviceId, startTime, startTime, 1000, "key-1"))
                .isInstanceOf(InvalidBookingException.class);
    }

    @Test
    void constructor_withNegativePrice_throws() {
        assertThatThrownBy(() -> new Booking(customerId, providerId, serviceId, startTime, endTime, -1, "key-1"))
                .isInstanceOf(InvalidBookingException.class);
    }

    @Test
    void constructor_withBlankIdempotencyKey_throws() {
        assertThatThrownBy(() -> new Booking(customerId, providerId, serviceId, startTime, endTime, 1000, "  "))
                .isInstanceOf(InvalidBookingException.class);
    }
}
