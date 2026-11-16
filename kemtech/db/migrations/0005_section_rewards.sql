-- 0005: XP for finishing a section is granted once per (user, section).
CREATE TABLE section_rewards (
  user_id     integer     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id  integer     NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  rewarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section_id)
);
