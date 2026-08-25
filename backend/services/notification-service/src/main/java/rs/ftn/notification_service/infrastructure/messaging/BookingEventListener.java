package rs.ftn.notification_service.infrastructure.messaging;

import tools.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import rs.ftn.notification_service.application.services.NotificationProcessingService;
import rs.ftn.notification_service.domain.models.NotificationType;
import rs.ftn.notification_service.infrastructure.messaging.dto.BookingCancelledEvent;
import rs.ftn.notification_service.infrastructure.messaging.dto.BookingCreatedEvent;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;

/**
 * Slusa notification.booking-events queue (booking.* routing keys) i za svaki
 * dogadjaj koji booking-service objavi kroz outbox->RabbitMQ generise obavestenje.
 */
@Component
public class BookingEventListener {

    private static final Logger log = LoggerFactory.getLogger(BookingEventListener.class);
    private static final DateTimeFormatter DISPLAY_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy. HH:mm");

    private final NotificationProcessingService notificationProcessingService;
    private final JsonMapper jsonMapper;

    public BookingEventListener(NotificationProcessingService notificationProcessingService, JsonMapper jsonMapper) {
        this.notificationProcessingService = notificationProcessingService;
        this.jsonMapper = jsonMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
    public void onBookingEvent(Message message) {
        String routingKey = message.getMessageProperties().getReceivedRoutingKey();
        String payload = new String(message.getBody(), StandardCharsets.UTF_8);

        if (routingKey == null) {
            log.warn("Poruka bez routing key-a, ignorise se");
            return;
        }

        try {
            switch (routingKey) {
                case "booking.created" -> handleBookingCreated(payload);
                case "booking.cancelled" -> handleBookingCancelled(payload);
                default -> log.warn("Nepoznat routing key '{}', poruka se ignorise", routingKey);
            }
        } catch (Exception e) {
            log.error("Obrada dogadjaja sa routing key-em '{}' nije uspela", routingKey, e);
        }
    }

    private void handleBookingCreated(String payload) throws Exception {
        BookingCreatedEvent event = jsonMapper.readValue(payload, BookingCreatedEvent.class);
        String text = "Rezervacija potvrdjena za " + event.startTime().format(DISPLAY_FORMAT) + ".";
        notificationProcessingService.process(NotificationType.BOOKING_CREATED, event.bookingId(), event.customerId(), text);
    }

    private void handleBookingCancelled(String payload) throws Exception {
        BookingCancelledEvent event = jsonMapper.readValue(payload, BookingCancelledEvent.class);
        String text = "Rezervacija otkazana" + (event.penaltyAmount() > 0
                ? " (penal: " + event.penaltyAmount() + ")."
                : ".");
        notificationProcessingService.process(NotificationType.BOOKING_CANCELLED, event.bookingId(), event.customerId(), text);
    }
}
