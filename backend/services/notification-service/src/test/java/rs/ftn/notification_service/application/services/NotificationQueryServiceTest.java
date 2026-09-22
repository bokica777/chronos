package rs.ftn.notification_service.application.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import rs.ftn.notification_service.domain.models.Notification;
import rs.ftn.notification_service.domain.repositories.NotificationRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationQueryServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Test
    void listAllForAdmin_returnsNotificationsOrderedByRepository() {
        Notification notification = mock(Notification.class);
        when(notificationRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(notification));

        NotificationQueryService service = new NotificationQueryService(notificationRepository);

        assertThat(service.listAllForAdmin()).containsExactly(notification);
    }
}
