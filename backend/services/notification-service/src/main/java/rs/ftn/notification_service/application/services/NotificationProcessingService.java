package rs.ftn.notification_service.application.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import rs.ftn.notification_service.domain.models.Notification;
import rs.ftn.notification_service.domain.models.NotificationStatus;
import rs.ftn.notification_service.domain.models.NotificationType;
import rs.ftn.notification_service.domain.repositories.NotificationRepository;

import java.util.UUID;

@Service
public class NotificationProcessingService {

    private static final String CHANNEL = "EMAIL";
    private static final Logger log = LoggerFactory.getLogger(NotificationProcessingService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationSender notificationSender;

    public NotificationProcessingService(NotificationRepository notificationRepository,
                                          NotificationSender notificationSender) {
        this.notificationRepository = notificationRepository;
        this.notificationSender = notificationSender;
    }

    // Vraca true ako je dogadjaj NOV i obradjen, false ako je duplikat (vec
    // obradjen eventId). Pozivalac (BookingEventListener) salje mejlove samo
    // za nove dogadjaje, da ponovljena isporuka iz RabbitMQ-a ne bi poslala
    // isti mejl dva puta.
    public boolean process(NotificationType type, UUID bookingId, UUID customerId, String message, UUID eventId) {
        if (notificationRepository.existsBySourceEventId(eventId)) {
            log.warn("Event {} already processed, skipping duplicate delivery", eventId);
            return false;
        }

        NotificationStatus status;
        try {
            notificationSender.send(customerId, CHANNEL, message);
            status = NotificationStatus.SENT;
        } catch (Exception e) {
            log.error("Failed to send notification for booking {}", bookingId, e);
            status = NotificationStatus.FAILED;
        }

        Notification notification = new Notification(bookingId, customerId, type, CHANNEL, message, status, eventId);
        notificationRepository.save(notification);
        log.info("Notification {} recorded for booking {} (status={})", type, bookingId, status);
        return true;
    }
}
