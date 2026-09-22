package rs.ftn.booking_service.infrastructure.messaging;

import tools.jackson.databind.json.JsonMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import rs.ftn.booking_service.application.services.BookingService;
import rs.ftn.booking_service.infrastructure.messaging.dto.PaymentCompletedEvent;

import java.nio.charset.StandardCharsets;

@Component
public class PaymentEventListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventListener.class);

    private final BookingService bookingService;
    private final JsonMapper jsonMapper;

    public PaymentEventListener(BookingService bookingService, JsonMapper jsonMapper) {
        this.bookingService = bookingService;
        this.jsonMapper = jsonMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.BOOKING_PAYMENT_QUEUE)
    public void onPaymentEvent(Message message) {
        String routingKey = message.getMessageProperties().getReceivedRoutingKey();
        String payload = new String(message.getBody(), StandardCharsets.UTF_8);

        if (routingKey == null) {
            log.warn("Message has no routing key, ignoring");
            return;
        }

        try {
            switch (routingKey) {
                case "payment.completed" -> handlePaymentCompleted(payload);
                default -> log.warn("Unknown routing key '{}', ignoring message", routingKey);
            }
        } catch (Exception e) {
            log.error("Failed to process message with routing key '{}'", routingKey, e);
        }
    }

    private void handlePaymentCompleted(String payload) throws Exception {
        PaymentCompletedEvent event = jsonMapper.readValue(payload, PaymentCompletedEvent.class);
        bookingService.confirmPayment(event.bookingId(), event.eventId());
    }
}
