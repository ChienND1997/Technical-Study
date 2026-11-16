-- 0009: sign-in is Google only for now.
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
