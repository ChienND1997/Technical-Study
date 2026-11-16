-- 0015: study groups with chat and assignments, and a reference id on notifications (for group invites).
CREATE TABLE study_groups (
  id          bigserial PRIMARY KEY,
  name        text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  created_by  bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- role: leader (exactly one per group), deputy (can manage members and assignments), member
CREATE TABLE group_members (
  group_id  bigint      NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id   bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'deputy', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_members_user_idx ON group_members (user_id);

CREATE TABLE group_invites (
  id           bigserial PRIMARY KEY,
  group_id     bigint      NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  inviter_id   bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id   bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
CREATE UNIQUE INDEX group_invites_pending_uq ON group_invites (group_id, invitee_id) WHERE status = 'pending';

CREATE TABLE group_messages (
  id         bigserial PRIMARY KEY,
  group_id   bigint      NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id    bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX group_messages_group_idx ON group_messages (group_id, id DESC);

CREATE TABLE group_assignments (
  id          bigserial PRIMARY KEY,
  group_id    bigint      NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  created_by  bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  due_date    date,
  lesson_id   bigint      REFERENCES lessons(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX group_assignments_group_idx ON group_assignments (group_id, created_at DESC);

CREATE TABLE group_assignment_members (
  assignment_id bigint      NOT NULL REFERENCES group_assignments(id) ON DELETE CASCADE,
  user_id       bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  done_at       timestamptz,
  PRIMARY KEY (assignment_id, user_id)
);
CREATE INDEX group_assignment_members_user_idx ON group_assignment_members (user_id);

ALTER TABLE notifications ADD COLUMN ref_id bigint;
