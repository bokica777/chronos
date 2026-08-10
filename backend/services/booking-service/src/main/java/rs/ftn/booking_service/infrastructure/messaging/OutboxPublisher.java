package rs.ftn.booking_service.infrastructure.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import rs.ftn.booking_service.domain.models.OutboxMessage;
import rs.ftn.booking_service.domain.repositories.OutboxMessageRepository;

import java.util.List;

@Component
public class OutboxPublisher {

    private final OutboxMessageRepository outboxMessageRepository;
    private final RabbitTemplate rabbitTemplate;

    public OutboxPublisher(OutboxMessageRepository outboxMessageRepository, RabbitTemplate rabbitTemplate) {
        this.outboxMessageRepository = outboxMessageRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Scheduled(fixedDelay = 2000)
    @Transactional
    public void publishPendingMessages() {
        List<OutboxMessage> pending = outboxMessageRepository.findByPublishedAtIsNull();
        for (OutboxMessage message : pending) {
            String routingKey = switch (message.getEventType()) {
                case "BookingCreated" -> "booking.created";
                case "BookingCancelled" -> "booking.cancelled";
                default -> "booking.unknown";
            };
            rabbitTemplate.convertAndSend(RabbitMQConfig.BOOKING_EVENTS_EXCHANGE, routingKey, message.getPayload());
            message.markPublished();
        }
    }
}
