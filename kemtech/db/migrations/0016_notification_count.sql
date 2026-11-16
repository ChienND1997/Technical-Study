-- 0016: merge repeated notifications (e.g. many chat messages) into one row with a counter.
ALTER TABLE notifications ADD COLUMN count integer NOT NULL DEFAULT 1;
CREATE INDEX notifications_ref_idx ON notifications (user_id, type, ref_id) WHERE read_at IS NULL;
