-- 0007: sign-in. Users can come from Google (google_sub) or be created by an admin; soft delete via deleted_at.
ALTER TABLE users ADD COLUMN email         text;
ALTER TABLE users ADD COLUMN google_sub    text;
ALTER TABLE users ADD COLUMN avatar_url    text;
ALTER TABLE users ADD COLUMN password_hash text;
ALTER TABLE users ADD COLUMN active        boolean     NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN deleted_at    timestamptz;
CREATE UNIQUE INDEX users_email_uq      ON users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX users_google_sub_uq ON users (google_sub)   WHERE google_sub IS NOT NULL;
