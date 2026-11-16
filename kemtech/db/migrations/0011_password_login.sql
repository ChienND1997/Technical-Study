-- 0011: email + password sign-in for accounts an admin creates.
ALTER TABLE users ADD COLUMN password_hash text;
