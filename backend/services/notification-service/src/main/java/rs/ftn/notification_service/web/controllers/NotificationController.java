package rs.ftn.notification_service.web.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rs.ftn.notification_service.application.services.NotificationQueryService;
import rs.ftn.notification_service.domain.models.Notification;
import rs.ftn.notification_service.web.dtos.NotificationResponse;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationQueryService notificationQueryService;

    public NotificationController(NotificationQueryService notificationQueryService) {
        this.notificationQueryService = notificationQueryService;
    }

    @GetMapping("/admin/all")
    public List<NotificationResponse> listAllForAdmin() {
        List<Notification> notifications = notificationQueryService.listAllForAdmin();
        List<NotificationResponse> responses = new ArrayList<>();
        for (Notification notification : notifications) {
            responses.add(NotificationResponse.fromDomain(notification));
        }
        return responses;
    }
}
