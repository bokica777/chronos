package rs.ftn.notification_service.application.services;

import java.util.UUID;

public interface NotificationSender {

    void send(UUID customerId, String channel, String message);
}
