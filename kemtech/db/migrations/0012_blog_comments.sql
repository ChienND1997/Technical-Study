-- 0012: comments on community posts ('post') and on curated lessons ('lesson').
CREATE TABLE blog_comments (
  id          bigserial PRIMARY KEY,
  user_id     bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text        NOT NULL CHECK (target_type IN ('post','lesson')),
  target_id   bigint      NOT NULL,
  body        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blog_comments_target_idx ON blog_comments (target_type, target_id, created_at);
