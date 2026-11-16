-- 0003: lộ trình học theo ngày (tracks -> plan_days -> plan_day_items).
CREATE TABLE tracks (
  id              serial PRIMARY KEY,
  slug            text    NOT NULL UNIQUE,
  title           text    NOT NULL,
  description     text,
  minutes_per_day integer NOT NULL DEFAULT 45,
  sort_order      integer NOT NULL DEFAULT 0
);

CREATE TABLE plan_days (
  id      serial PRIMARY KEY,
  track_id integer NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  day_no  integer NOT NULL,
  title   text    NOT NULL,
  minutes integer NOT NULL DEFAULT 0,
  UNIQUE (track_id, day_no)
);

-- One item = sections sec_from..sec_to of a lesson, read on that day.
CREATE TABLE plan_day_items (
  id        serial PRIMARY KEY,
  day_id    integer NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  ord       integer NOT NULL,
  lesson_id integer NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  sec_from  integer NOT NULL,
  sec_to    integer NOT NULL CHECK (sec_to >= sec_from),
  UNIQUE (day_id, ord)
);
CREATE INDEX plan_day_items_lesson_idx ON plan_day_items (lesson_id);
