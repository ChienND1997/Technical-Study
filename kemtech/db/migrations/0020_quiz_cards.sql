-- 0020: Thêm loại thẻ 'quiz' cho các câu hỏi trắc nghiệm chuyên biệt có 4 phương án
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_kind_check;
ALTER TABLE cards ADD CONSTRAINT cards_kind_check CHECK (kind IN ('qa','followup','core','summary','quiz'));
