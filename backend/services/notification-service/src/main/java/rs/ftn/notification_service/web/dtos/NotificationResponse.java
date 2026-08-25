package rs.ftn.notification_service.web.dtos;

import rs.ftn.notification_service.domain.models.Notification;
import rs.ftn.notification_service.domain.models.NotificationStatus;
import rs.ftn.notification_service.domain.models.NotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        UUID bookingId,
        UUID customerId,
        NotificationType type,
        String channel,
        String message,
        NotificationStatus status,
        LocalDateTime createdAt,
        LocalDateTime sentAt
) {
    public static NotificationResponse fromDomain(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getBookingId(),
                notification.getCustomerId(),
                notification.getType(),
                notification.getChannel(),
                notification.getMessage(),
                notification.getStatus(),
                notification.getCreatedAt(),
                notification.getSentAt()
        );
    }
}
