package rs.ftn.notification_service.web.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rs.ftn.notification_service.domain.models.Notification;
import rs.ftn.notification_service.domain.repositories.NotificationRepository;
import rs.ftn.notification_service.web.dtos.NotificationResponse;

import java.util.ArrayList;
import java.util.List;

// Admin pregled poslatih/neuspelih obavestenja (zastita hasRole("Admin") je u SecurityConfig).
// Ovo je jedini REST endpoint servisa - dokaz da RabbitMQ listener zaista obradjuje evente.
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping("/admin/all")
    public List<NotificationResponse> listAllForAdmin() {
        List<Notification> notifications = notificationRepository.findAllByOrderByCreatedAtDesc();
        List<NotificationResponse> responses = new ArrayList<>();
        for (Notification notification : notifications) {
            responses.add(NotificationResponse.fromDomain(notification));
        }
        return responses;
    }
}
