package rs.ftn.notification_service.application.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import rs.ftn.notification_service.domain.models.Notification;
import rs.ftn.notification_service.domain.models.NotificationStatus;
import rs.ftn.notification_service.domain.models.NotificationType;
import rs.ftn.notification_service.domain.repositories.NotificationRepository;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationProcessingServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private NotificationSender notificationSender;

    private final UUID bookingId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();
    private final UUID eventId = UUID.randomUUID();

    @Test
    void process_newEvent_senderSucceeds_savesWithSentStatus() {
        when(notificationRepository.existsBySourceEventId(eventId)).thenReturn(false);
        NotificationProcessingService service = new NotificationProcessingService(notificationRepository, notificationSender);

        service.process(NotificationType.BOOKING_CREATED, bookingId, customerId, "message text", eventId);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(captor.getValue().getSourceEventId()).isEqualTo(eventId);
    }

    @Test
    void process_newEvent_senderThrows_savesWithFailedStatus() {
        when(notificationRepository.existsBySourceEventId(eventId)).thenReturn(false);
        doThrow(new RuntimeException("channel unavailable")).when(notificationSender).send(any(), any(), any());
        NotificationProcessingService service = new NotificationProcessingService(notificationRepository, notificationSender);

        service.process(NotificationType.BOOKING_CANCELLED, bookingId, customerId, "message text", eventId);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(NotificationStatus.FAILED);
    }

    @Test
    void process_duplicateEvent_skipsSendingAndSaving() {
        when(notificationRepository.existsBySourceEventId(eventId)).thenReturn(true);
        NotificationProcessingService service = new NotificationProcessingService(notificationRepository, notificationSender);

        boolean processed = service.process(NotificationType.BOOKING_CREATED, bookingId, customerId, "message text", eventId);

        assertThat(processed).isFalse();
        verifyNoInteractions(notificationSender);
        verify(notificationRepository, never()).save(any());
    }
}
