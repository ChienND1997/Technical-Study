-- 0017: @mentions inside group chat messages.
ALTER TABLE group_messages ADD COLUMN mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
