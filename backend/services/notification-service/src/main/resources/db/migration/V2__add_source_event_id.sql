ALTER TABLE notifications ADD source_event_id UNIQUEIDENTIFIER NULL;

CREATE UNIQUE INDEX UX_notifications_source_event_id ON notifications (source_event_id) WHERE source_event_id IS NOT NULL;
