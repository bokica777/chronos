package rs.ftn.notification_service.infrastructure.messaging;

import tools.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import rs.ftn.notification_service.application.services.BookingEmailNotifier;
import rs.ftn.notification_service.application.services.NotificationProcessingService;
import rs.ftn.notification_service.domain.models.NotificationType;
import rs.ftn.notification_service.infrastructure.messaging.dto.BookingCancelledEvent;
import rs.ftn.notification_service.infrastructure.messaging.dto.BookingCreatedEvent;
import rs.ftn.notification_service.infrastructure.messaging.dto.BookingPaymentConfirmedEvent;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;

@Component
public class BookingEventListener {

    private static final Logger log = LoggerFactory.getLogger(BookingEventListener.class);
    private static final DateTimeFormatter DISPLAY_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy. HH:mm");

    private final NotificationProcessingService notificationProcessingService;
    private final BookingEmailNotifier bookingEmailNotifier;
    private final JsonMapper jsonMapper;

    public BookingEventListener(NotificationProcessingService notificationProcessingService,
                                BookingEmailNotifier bookingEmailNotifier,
                                JsonMapper jsonMapper) {
        this.notificationProcessingService = notificationProcessingService;
        this.bookingEmailNotifier = bookingEmailNotifier;
        this.jsonMapper = jsonMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
    public void onBookingEvent(Message message) {
        String routingKey = message.getMessageProperties().getReceivedRoutingKey();
        String payload = new String(message.getBody(), StandardCharsets.UTF_8);

        if (routingKey == null) {
            log.warn("Message has no routing key, ignoring");
            return;
        }

        try {
            switch (routingKey) {
                case "booking.created" -> handleBookingCreated(payload);
                case "booking.cancelled" -> handleBookingCancelled(payload);
                case "booking.payment-confirmed" -> handleBookingPaymentConfirmed(payload);
                default -> log.warn("Unknown routing key '{}', ignoring message", routingKey);
            }
        } catch (Exception e) {
            log.error("Failed to process message with routing key '{}'", routingKey, e);
        }
    }

    private void handleBookingCreated(String payload) throws Exception {
        BookingCreatedEvent event = jsonMapper.readValue(payload, BookingCreatedEvent.class);
        String text = "Rezervacija potvrdjena za " + event.startTime().format(DISPLAY_FORMAT) + ".";
        boolean isNew = notificationProcessingService.process(
                NotificationType.BOOKING_CREATED, event.bookingId(), event.customerId(), text, event.eventId());
        if (isNew) {
            bookingEmailNotifier.bookingCreated(event.bookingId(), event.customerId(), event.providerId(),
                    event.serviceId(), event.startTime(), event.endTime(), event.price());
        }
    }

    private void handleBookingCancelled(String payload) throws Exception {
        BookingCancelledEvent event = jsonMapper.readValue(payload, BookingCancelledEvent.class);
        String text = "Rezervacija otkazana" + (event.penaltyAmount() > 0
                ? " (penal: " + event.penaltyAmount() + ")."
                : ".");
        notificationProcessingService.process(NotificationType.BOOKING_CANCELLED, event.bookingId(), event.customerId(), text, event.eventId());
    }

    private void handleBookingPaymentConfirmed(String payload) throws Exception {
        BookingPaymentConfirmedEvent event = jsonMapper.readValue(payload, BookingPaymentConfirmedEvent.class);
        String text = "Uplata za rezervaciju je uspesno izvrsena.";
        boolean isNew = notificationProcessingService.process(
                NotificationType.BOOKING_PAYMENT_CONFIRMED, event.bookingId(), event.customerId(), text, event.eventId());
        if (isNew) {
            bookingEmailNotifier.paymentConfirmed(event.bookingId(), event.customerId(), event.providerId(),
                    event.serviceId(), event.startTime(), event.price());
        }
    }
}
