-- 0002: nội dung học, sinh ra từ thư mục docs-v2 bởi lệnh `npm run ingest`.
-- Chủ đề (topic) có thể lồng nhau qua parent_id.
CREATE TABLE topics (
  id          serial PRIMARY KEY,
  slug        text    NOT NULL UNIQUE,
  path        text    NOT NULL UNIQUE,
  title       text    NOT NULL,
  description text,
  intro_md    text,
  parent_id   integer REFERENCES topics(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0
);

-- Bài học: mỗi file .md trong docs-v2 là một lesson, chia thành các section.
CREATE TABLE lessons (
  id           serial PRIMARY KEY,
  topic_id     integer NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  path         text    NOT NULL UNIQUE,          -- '08-Java/Java-Core/easy/lt-02-kieu-du-lieu-string.md'
  title        text    NOT NULL,
  kind         text    NOT NULL CHECK (kind IN ('lesson','qa','guide')),
  level        smallint CHECK (level BETWEEN 1 AND 3),   -- 1 easy, 2 medium, 3 hard, NULL nếu không phân mức
  ord          integer NOT NULL DEFAULT 0,       -- thứ tự trong chủ đề (theo mức rồi tên file)
  word_count   integer NOT NULL DEFAULT 0,
  minutes      integer NOT NULL DEFAULT 1,
  summary      text[]  NOT NULL DEFAULT '{}',    -- các gạch đầu dòng "Tóm tắt"
  content_hash char(64) NOT NULL
);
CREATE INDEX lessons_topic_idx ON lessons (topic_id, level, ord);

CREATE TABLE sections (
  id         serial PRIMARY KEY,
  lesson_id  integer NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  ord        integer NOT NULL,                   -- 0..n, liên tục
  heading    text    NOT NULL,
  body_md    text    NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  minutes    integer NOT NULL DEFAULT 1,
  search     tsvector,
  UNIQUE (lesson_id, ord)
);
CREATE INDEX sections_search_idx ON sections USING gin (search);

-- Thẻ ôn tập sinh tự động từ nội dung:
--   qa        : "Câu hỏi" + "Đáp án ngắn" trong file qa-*
--   followup  : "Hỏi xoáy N" + "Lập luận"
--   core      : đoạn "Cốt lõi" của bài lý thuyết
--   summary   : cả khối "Tóm tắt" của bài
CREATE TABLE cards (
  id         serial PRIMARY KEY,
  lesson_id  integer NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  section_ord integer,
  kind       text    NOT NULL CHECK (kind IN ('qa','followup','core','summary')),
  ord        integer NOT NULL,                   -- thứ tự trong (lesson, kind)
  front      text    NOT NULL,
  back       text    NOT NULL,
  extra      jsonb   NOT NULL DEFAULT '{}',      -- {"nho": "..."}
  UNIQUE (lesson_id, kind, ord)
);
CREATE INDEX cards_lesson_idx ON cards (lesson_id);
