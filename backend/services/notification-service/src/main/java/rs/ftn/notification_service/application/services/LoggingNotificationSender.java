package rs.ftn.notification_service.application.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class LoggingNotificationSender implements NotificationSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationSender.class);

    @Override
    public void send(UUID customerId, String channel, String message) {
        log.info("[{}] Notification for customer {}: {}", channel, customerId, message);
    }
}
