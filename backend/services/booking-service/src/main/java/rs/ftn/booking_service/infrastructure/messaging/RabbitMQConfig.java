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
    public static final String PAYMENT_EVENTS_EXCHANGE = "payment.events";
    public static final String BOOKING_PAYMENT_QUEUE = "booking.payment-events";

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

    @Bean
    public TopicExchange paymentEventsExchange() {
        return new TopicExchange(PAYMENT_EVENTS_EXCHANGE);
    }

    @Bean
    public Queue bookingPaymentQueue() {
        return new Queue(BOOKING_PAYMENT_QUEUE, true);
    }

    @Bean
    public Binding bookingPaymentBinding(Queue bookingPaymentQueue, TopicExchange paymentEventsExchange) {
        return BindingBuilder.bind(bookingPaymentQueue).to(paymentEventsExchange).with("payment.*");
    }
}
