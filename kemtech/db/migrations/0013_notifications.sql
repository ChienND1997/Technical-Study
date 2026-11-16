-- 0013: in-app notifications (bell) and @mentions stored on comments.
CREATE TABLE notifications (
  id         bigserial PRIMARY KEY,
  user_id    bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id   bigint      REFERENCES users(id) ON DELETE SET NULL,
  type       text        NOT NULL,
  text       text        NOT NULL,
  link       text,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE blog_comments ADD COLUMN mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
