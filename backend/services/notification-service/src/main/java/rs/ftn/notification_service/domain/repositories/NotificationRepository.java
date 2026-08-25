package rs.ftn.notification_service.domain.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ftn.notification_service.domain.models.Notification;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findAllByOrderByCreatedAtDesc();
}
