package rs.ftn.notification_service.application.services;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

// Jedino mesto koje stvarno salje mejl preko SMTP-a (Gmail App Password ili bilo
// koji drugi SMTP - vidi docs/notification-email-setup.md). Ako slanje nije
// ukljuceno ili ne uspe, samo se loguje - nikad ne baca izuzetak dalje, da
// neuspeo mejl ne bi srusio obradu dogadjaja iz RabbitMQ-a.
@Component
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String fromAddress;
    private final String fromName;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${notifications.email.enabled}") boolean enabled,
            @Value("${notifications.email.from}") String fromAddress,
            @Value("${notifications.email.from-name}") String fromName,
            @Value("${spring.mail.username:}") String smtpUsername) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        // Gmail ionako salje sa adrese naloga, pa je prazan SMTP_FROM = SMTP_USERNAME.
        this.fromAddress = fromAddress == null || fromAddress.isBlank() ? smtpUsername : fromAddress;
        this.fromName = fromName;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void send(String to, String subject, String htmlBody) {
        if (to == null || to.isBlank()) {
            log.warn("No recipient address for email '{}' - skipping.", subject);
            return;
        }
        if (!enabled) {
            log.info("Email sending is disabled (NOTIFICATIONS_EMAIL_ENABLED=false) - would have sent '{}' to {}.",
                    subject, to);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Sent email '{}' to {}", subject, to);
        } catch (Exception ex) {
            log.error("Failed to send email '{}' to {}", subject, to, ex);
        }
    }
}
