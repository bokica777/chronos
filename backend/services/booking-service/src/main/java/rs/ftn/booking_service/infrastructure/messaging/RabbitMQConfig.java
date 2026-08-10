package rs.ftn.booking_service.infrastructure.messaging;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String BOOKING_EVENTS_EXCHANGE = "booking.events";
    public static final String NOTIFICATION_QUEUE = "notification.booking-events";

    @Bean
    public TopicExchange bookingEventsExchange() {
        return new TopicExchange(BOOKING_EVENTS_EXCHANGE);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(NOTIFICATION_QUEUE, true);
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange bookingEventsExchange) {
        return BindingBuilder.bind(notificationQueue).to(bookingEventsExchange).with("booking.*");
    }
}
