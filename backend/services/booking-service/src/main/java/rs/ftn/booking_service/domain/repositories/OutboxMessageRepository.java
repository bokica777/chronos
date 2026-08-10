package rs.ftn.booking_service.domain.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import rs.ftn.booking_service.domain.models.OutboxMessage;

import java.util.List;
import java.util.UUID;

public interface OutboxMessageRepository extends JpaRepository<OutboxMessage, UUID> {

    List<OutboxMessage> findByPublishedAtIsNull();
}
