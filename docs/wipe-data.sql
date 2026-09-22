-- Brise sve podatke iz Chronos baza, osim admin naloga u AuthDb.
-- Pokretati na SQL Server instanci (localhost,1433 / sa / Chronos!2026),
-- svaki blok protiv odgovarajuce baze (USE naredba na pocetku bloka).
-- Redosled DELETE-ova unutar baze nije bitan - nema FK constraint-a
-- izmedju tabela (ni cross-aggregate unutar iste baze), samo plain Guid kolone.

-- === AuthDb ===
USE AuthDb;
DELETE FROM Users WHERE Email <> 'admin@admin.com';

-- === ProviderDb ===
USE ProviderDb;
DELETE FROM Services;
DELETE FROM Providers;
DELETE FROM Categories;

-- === PaymentDb ===
USE PaymentDb;
DELETE FROM OutboxMessages;
DELETE FROM Payments;

-- === BookingDb ===
USE BookingDb;
DELETE FROM outbox;
DELETE FROM bookings;

-- === NotificationDb ===
USE NotificationDb;
DELETE FROM notifications;
