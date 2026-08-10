package rs.ftn.booking_service.domain.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rs.ftn.booking_service.domain.models.Booking;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {

    boolean existsByIdempotencyKey(String idempotencyKey);

    List<Booking> findByCustomerId(UUID customerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT b FROM Booking b
            WHERE b.providerId = :providerId
              AND b.status <> rs.ftn.booking_service.domain.models.BookingStatus.CANCELLED
              AND b.startTime < :endTime
              AND :startTime < b.endTime
            """)
    List<Booking> findOverlapping(@Param("providerId") UUID providerId,
                                   @Param("startTime") LocalDateTime startTime,
                                   @Param("endTime") LocalDateTime endTime);
}
