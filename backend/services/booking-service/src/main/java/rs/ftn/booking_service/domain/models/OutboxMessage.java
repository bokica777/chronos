package rs.ftn.booking_service.domain.models;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "outbox")
public class OutboxMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uniqueidentifier")
    private UUID id;

    @Column(name = "aggregate_id", columnDefinition = "uniqueidentifier", nullable = false)
    private UUID aggregateId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false, columnDefinition = "nvarchar(max)")
    private String payload;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    protected OutboxMessage() {
    }

    public OutboxMessage(UUID aggregateId, String eventType, String payload) {
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.payload = payload;
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getAggregateId() { return aggregateId; }
    public String getEventType() { return eventType; }
    public String getPayload() { return payload; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getPublishedAt() { return publishedAt; }

    public void markPublished() {
        this.publishedAt = LocalDateTime.now();
    }
}