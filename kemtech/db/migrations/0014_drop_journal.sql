-- 0014: the personal journal feature was removed (legacy tables, if they exist).
DROP TABLE IF EXISTS journal_notes CASCADE;
DROP TABLE IF EXISTS journal_quotes CASCADE;
