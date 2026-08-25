package rs.ftn.notification_service.application.services;

import java.util.UUID;

/**
 * Apstrakcija kanala za slanje obavestenja. Danas postoji samo simulirana (logujuca)
 * implementacija - LoggingNotificationSender - jer servis nema podesen pravi SMTP nalog.
 * Kad se doda stvarni provajder (npr. Spring Mail / SendGrid), dovoljno je dodati novu
 * implementaciju ovog interfejsa bez diranja NotificationProcessingService-a.
 */
public interface NotificationSender {

    void send(UUID customerId, String channel, String message);
}
