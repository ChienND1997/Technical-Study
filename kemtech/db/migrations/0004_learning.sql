-- 0004: dữ liệu học của người dùng. Có user_id ở mọi bảng để sau này thêm đăng nhập
-- mà không phải đổi schema (hiện tại dùng 1 user mặc định id = 1).

CREATE TABLE users (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  settings   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_tracks (
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id   integer NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  active     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, track_id)
);
-- tối đa một lộ trình đang học cho mỗi user
CREATE UNIQUE INDEX user_tracks_one_active ON user_tracks (user_id) WHERE active;

CREATE TABLE progress_sections (
  user_id      integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id   integer NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section_id)
);

CREATE TABLE notes (
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  integer NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  body       text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- "Giỏ thẻ": thẻ nào có dòng ở đây thì mới được ôn.
CREATE TABLE card_states (
  user_id          integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id          integer NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  state            text NOT NULL DEFAULT 'new' CHECK (state IN ('new','learning','review')),
  due_at           timestamptz NOT NULL DEFAULT now(),
  interval_minutes integer NOT NULL DEFAULT 0,
  ease             real    NOT NULL DEFAULT 2.5,
  reps             integer NOT NULL DEFAULT 0,
  lapses           integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  added_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX card_states_due_idx ON card_states (user_id, due_at);

CREATE TABLE review_logs (
  id           bigserial PRIMARY KEY,
  user_id      integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id      integer NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 4),
  direction    text NOT NULL DEFAULT 'qa' CHECK (direction IN ('qa','aq')),
  prev_interval integer NOT NULL DEFAULT 0,
  new_interval  integer NOT NULL DEFAULT 0,
  duration_ms  integer,
  reviewed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_logs_user_time_idx ON review_logs (user_id, reviewed_at);

CREATE TABLE quiz_attempts (
  id          bigserial PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id     integer NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  correct     boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_user_card_idx ON quiz_attempts (user_id, card_id, answered_at DESC);

CREATE TABLE mock_sessions (
  id           serial PRIMARY KEY,
  user_id      integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope        text,                                -- slug chủ đề hoặc NULL = tất cả
  started_at   timestamptz NOT NULL DEFAULT now(),
  duration_sec integer NOT NULL DEFAULT 0
);

-- score: 0 chưa trả lời được, 1 cơ bản, 2 vững, 3 sâu (thang trong 00-Roadmap/cham-diem-mock-interview.md)
CREATE TABLE mock_answers (
  session_id integer NOT NULL REFERENCES mock_sessions(id) ON DELETE CASCADE,
  card_id    integer NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  ord        integer NOT NULL,
  score      smallint NOT NULL CHECK (score BETWEEN 0 AND 3),
  PRIMARY KEY (session_id, ord)
);

CREATE TABLE daily_activity (
  user_id        integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day            date    NOT NULL,                 -- ngày theo múi giờ APP_TZ
  seconds        integer NOT NULL DEFAULT 0,
  cards_reviewed integer NOT NULL DEFAULT 0,
  sections_done  integer NOT NULL DEFAULT 0,
  xp             integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

INSERT INTO users (id, name) VALUES (1, 'Me');
SELECT setval(pg_get_serial_sequence('users', 'id'), 1);
