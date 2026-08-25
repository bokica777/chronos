package rs.ftn.notification_service.domain.models;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uniqueidentifier")
    private UUID id;

    @Column(name = "booking_id", columnDefinition = "uniqueidentifier", nullable = false)
    private UUID bookingId;

    @Column(name = "customer_id", columnDefinition = "uniqueidentifier", nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 20)
    private String channel;

    @Column(nullable = false, columnDefinition = "nvarchar(1000)")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    protected Notification() {
    }

    public Notification(UUID bookingId, UUID customerId, NotificationType type, String channel,
                         String message, NotificationStatus status) {
        this.bookingId = bookingId;
        this.customerId = customerId;
        this.type = type;
        this.channel = channel;
        this.message = message;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.sentAt = status == NotificationStatus.SENT ? LocalDateTime.now() : null;
    }

    public UUID getId() { return id; }
    public UUID getBookingId() { return bookingId; }
    public UUID getCustomerId() { return customerId; }
    public NotificationType getType() { return type; }
    public String getChannel() { return channel; }
    public String getMessage() { return message; }
    public NotificationStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getSentAt() { return sentAt; }
}
