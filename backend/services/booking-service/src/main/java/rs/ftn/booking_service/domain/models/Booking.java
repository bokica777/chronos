package rs.ftn.booking_service.domain.models;

import jakarta.persistence.*;
import rs.ftn.booking_service.domain.exceptions.InvalidBookingException;
import rs.ftn.booking_service.domain.exceptions.InvalidBookingStateException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uniqueidentifier")
    private UUID id;

    @Column(name = "customer_id", columnDefinition = "uniqueidentifier", nullable = false)
    private UUID customerId;

    @Column(name = "provider_id", columnDefinition = "uniqueidentifier", nullable = false)
    private UUID providerId;

    @Column(name = "service_id", columnDefinition = "uniqueidentifier", nullable = false)
    private UUID serviceId;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookingStatus status;

    @Column(nullable = false)
    private double price;

    @Column(name = "penalty_amount", nullable = false)
    private double penaltyAmount = 0.0;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 64)
    private String idempotencyKey;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Booking() {
    }

    public Booking(UUID customerId, UUID providerId, UUID serviceId,
                    LocalDateTime startTime, LocalDateTime endTime,
                    double price, String idempotencyKey) {
        if (customerId == null || providerId == null || serviceId == null) {
            throw new InvalidBookingException("customerId, providerId and serviceId are required");
        }
        if (startTime == null || endTime == null) {
            throw new InvalidBookingException("startTime and endTime are required");
        }
        if (!endTime.isAfter(startTime)) {
            throw new InvalidBookingException("endTime must be after startTime");
        }
        if (price < 0) {
            throw new InvalidBookingException("price cannot be negative");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new InvalidBookingException("idempotencyKey is required");
        }

        this.customerId = customerId;
        this.providerId = providerId;
        this.serviceId = serviceId;
        this.startTime = startTime;
        this.endTime = endTime;
        this.price = price;
        this.idempotencyKey = idempotencyKey;
        this.status = BookingStatus.PENDING;
        this.penaltyAmount = 0.0;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getCustomerId() { return customerId; }
    public UUID getProviderId() { return providerId; }
    public UUID getServiceId() { return serviceId; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public BookingStatus getStatus() { return status; }
    public double getPrice() { return price; }
    public double getPenaltyAmount() { return penaltyAmount; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public Long getVersion() { return version; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void cancel() {
        if (this.status == BookingStatus.CANCELLED) {
            throw new InvalidBookingStateException("Booking is already cancelled");
        }
        LocalDateTime now = LocalDateTime.now();
        long hoursUntilStart = Duration.between(now, this.startTime).toHours();
        if (hoursUntilStart < 24) {
            this.penaltyAmount = this.price * 0.5;
        }
        this.status = BookingStatus.CANCELLED;
        this.updatedAt = now;
    }

    public void confirm() {
        if (this.status != BookingStatus.PENDING) {
            throw new InvalidBookingStateException("Only a PENDING booking can be confirmed");
        }
        this.status = BookingStatus.CONFIRMED;
        this.updatedAt = LocalDateTime.now();
    }
}
