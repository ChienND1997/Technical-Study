-- 0008: badges earned by users (levels are computed from XP, nothing stored).
CREATE TABLE user_badges (
  user_id   integer     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge     text        NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge)
);
