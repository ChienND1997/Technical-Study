-- 0019: group chat reactions and task mentions
CREATE TABLE IF NOT EXISTS group_message_reactions (
  message_id bigint NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction   text   NOT NULL CHECK (reaction IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_message_reactions_message_idx ON group_message_reactions (message_id);

ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS task_mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
