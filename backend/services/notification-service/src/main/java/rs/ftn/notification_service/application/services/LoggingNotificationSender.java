package rs.ftn.notification_service.application.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Simulirano slanje - ispisuje obavestenje u log umesto da zaista salje email.
 * Dovoljno za demonstraciju da Notification servis konzumira RabbitMQ evente i
 * reaguje na njih, bez potrebe za pravim SMTP nalogom u razvojnom okruzenju.
 */
@Component
public class LoggingNotificationSender implements NotificationSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationSender.class);

    @Override
    public void send(UUID customerId, String channel, String message) {
        log.info("[{}] Obavestenje za korisnika {}: {}", channel, customerId, message);
    }
}
