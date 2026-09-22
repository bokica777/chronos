package rs.ftn.notification_service.application.services;

import org.springframework.stereotype.Service;
import rs.ftn.notification_service.domain.models.Notification;
import rs.ftn.notification_service.domain.repositories.NotificationRepository;

import java.util.List;

@Service
public class NotificationQueryService {

    private final NotificationRepository notificationRepository;

    public NotificationQueryService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<Notification> listAllForAdmin() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }
}
