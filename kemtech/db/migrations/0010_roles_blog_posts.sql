-- 0010: roles (user/admin) and community blog posts that an admin reviews before they show.
ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin'));

CREATE TABLE blog_posts (
  id            bigserial PRIMARY KEY,
  user_id       bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  summary       text        NOT NULL DEFAULT '',
  body          text        NOT NULL,
  source_url    text,
  category      text        NOT NULL DEFAULT 'other',
  status        text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason text,
  reviewed_by   bigint      REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blog_posts_status_idx ON blog_posts (status, created_at DESC);
CREATE INDEX blog_posts_user_idx   ON blog_posts (user_id, created_at DESC);
