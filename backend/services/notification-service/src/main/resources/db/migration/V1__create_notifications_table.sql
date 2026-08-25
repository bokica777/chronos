CREATE TABLE notifications (
                                id            UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                                booking_id    UNIQUEIDENTIFIER NOT NULL,
                                customer_id   UNIQUEIDENTIFIER NOT NULL,
                                type          VARCHAR(30) NOT NULL,
                                channel       VARCHAR(20) NOT NULL,
                                message       NVARCHAR(1000) NOT NULL,
                                status        VARCHAR(20) NOT NULL,
                                created_at    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                                sent_at       DATETIME2 NULL
);

CREATE INDEX IX_notifications_booking_id ON notifications (booking_id);
CREATE INDEX IX_notifications_created_at ON notifications (created_at);
