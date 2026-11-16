-- 0021: Thêm loại 'quiz' vào lessons_kind_check
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_kind_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_kind_check CHECK (kind IN ('lesson','guide','qa','quiz'));

