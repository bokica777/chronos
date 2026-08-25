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

    public void process(NotificationType type, UUID bookingId, UUID customerId, String message) {
        NotificationStatus status;
        try {
            notificationSender.send(customerId, CHANNEL, message);
            status = NotificationStatus.SENT;
        } catch (Exception e) {
            log.error("Slanje obavestenja za rezervaciju {} nije uspelo", bookingId, e);
            status = NotificationStatus.FAILED;
        }

        Notification notification = new Notification(bookingId, customerId, type, CHANNEL, message, status);
        notificationRepository.save(notification);
        log.info("Obavestenje {} zabelezeno za rezervaciju {} (status={})", type, bookingId, status);
    }
}
