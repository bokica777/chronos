CREATE TABLE outbox (
                        id             UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                        aggregate_id   UNIQUEIDENTIFIER NOT NULL,
                        event_type     VARCHAR(50) NOT NULL,
                        payload        NVARCHAR(MAX) NOT NULL,
                        created_at     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                        published_at   DATETIME2 NULL
);

CREATE INDEX IX_outbox_unpublished ON outbox (published_at) WHERE published_at IS NULL;