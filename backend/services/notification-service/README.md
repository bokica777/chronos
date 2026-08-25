# Notification Service

Java / Spring Boot servis koji sluša RabbitMQ događaje sa `booking.events` exchange-a
(`booking.created`, `booking.cancelled`, objavljene od strane booking-service-a preko
outbox šablona) i za svaki generiše obaveštenje. Ujedno demonstrira da deployment i
observability proces nisu vezani za jedan programski jezik.

Trenutno "slanje" je simulirano (loguje se, ne šalje se pravi email) - kanal je
apstrahovan kroz `NotificationSender` interfejs, tako da je zamena za pravi
SMTP/email provajder izolovana promena.

## Lokalno pokretanje

1. `docker compose up -d` u `infra/docker` (SQL Server + RabbitMQ).
2. Ručno napraviti bazu `NotificationDb` na istoj SQL Server instanci (isto kao
   `BookingDb`, `AuthDb`, itd.) - Flyway pravi tabele, ne i samu bazu.
3. `mvn spring-boot:run` (port `8082`, konfigurisano u `application.properties`).

## REST API

- `GET /api/v1/notifications/admin/all` - lista svih zabeleženih obaveštenja
  (samo uloga Admin, JWT isti deljeni HMAC ključ kao ostali servisi). Vidljivo i u
  frontend admin panelu, tab "Obaveštenja".

## Baza (NotificationDb)

- `notifications` - `booking_id`, `customer_id`, `type` (BOOKING_CREATED /
  BOOKING_CANCELLED), `channel`, `message`, `status` (SENT / FAILED), `created_at`,
  `sent_at`.
