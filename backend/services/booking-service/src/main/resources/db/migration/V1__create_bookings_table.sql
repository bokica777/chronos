CREATE TABLE bookings (
                          id               UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                          customer_id      UNIQUEIDENTIFIER NOT NULL,
                          provider_id      UNIQUEIDENTIFIER NOT NULL,
                          service_id       UNIQUEIDENTIFIER NOT NULL,
                          start_time       DATETIME2 NOT NULL,
                          end_time         DATETIME2 NOT NULL,
                          status           VARCHAR(20) NOT NULL,
                          price            DECIMAL(10,2) NOT NULL,
                          penalty_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
                          idempotency_key  VARCHAR(64) NOT NULL,
                          version          BIGINT NOT NULL DEFAULT 0,
                          created_at       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                          updated_at       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                          CONSTRAINT UQ_bookings_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX IX_bookings_customer_start ON bookings (customer_id, start_time);
CREATE INDEX IX_bookings_provider_start_end ON bookings (provider_id, start_time, end_time);