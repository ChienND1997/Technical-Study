-- 0018: system announcements written by admins (maintenance, upgrades, new features) and shown to everyone.
CREATE TABLE announcements (
  id         serial PRIMARY KEY,
  kind       text        NOT NULL DEFAULT 'info' CHECK (kind IN ('info', 'feature', 'maintenance', 'upgrade')),
  title      text        NOT NULL,
  body       text        NOT NULL DEFAULT '',
  starts_at  timestamptz NOT NULL DEFAULT now(),
  ends_at    timestamptz,                       -- null = shown until an admin hides it
  active     boolean     NOT NULL DEFAULT true,
  created_by int REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX announcements_active_idx ON announcements (active, starts_at DESC);
