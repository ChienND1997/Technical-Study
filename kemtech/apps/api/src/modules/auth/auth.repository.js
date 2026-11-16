const COLS = 'id, name, email, avatar_url, role, active, deleted_at, password_hash, google_sub, settings, created_at';

/** SQL for the users table (shared by auth, admin and profile). */
export function createAuthRepository(db) {
  const one = async (text, params, exec = db) => (await exec.query(text, params)).rows[0] ?? null;
  return {
    findById: (id, exec = db) => one(`SELECT ${COLS} FROM users WHERE id = $1`, [id], exec),
    findByEmail: (email, exec = db) => one(`SELECT ${COLS} FROM users WHERE lower(email) = lower($1)`, [email], exec),
    findByGoogleSub: (sub) => one(`SELECT ${COLS} FROM users WHERE google_sub = $1`, [sub]),
    /** Password login lookup by email or display name; only live accounts that have a password. */
    findByLogin: (ident) =>
      one(
        `SELECT ${COLS} FROM users
          WHERE deleted_at IS NULL AND password_hash IS NOT NULL AND (lower(email) = lower($1) OR lower(name) = lower($1))
          ORDER BY (lower(email) = lower($1)) DESC, id LIMIT 1`,
        [ident],
      ),
    findAdminByName: (name) => one(`SELECT ${COLS} FROM users WHERE role = 'admin' AND lower(name) = lower($1) ORDER BY id LIMIT 1`, [name]),
    create: ({ name, email = null, role = 'user', passwordHash = null, googleSub = null, avatarUrl = null }) =>
      one(
        `INSERT INTO users (name, email, role, password_hash, google_sub, avatar_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${COLS}`,
        [name, email, role, passwordHash, googleSub, avatarUrl],
      ),
    linkGoogle: (id, sub, avatarUrl) =>
      one(`UPDATE users SET google_sub = $2, avatar_url = COALESCE($3, avatar_url) WHERE id = $1 RETURNING ${COLS}`, [id, sub, avatarUrl]),
    /** Everyone, including soft-deleted accounts, with total XP. */
    async listAll() {
      const { rows } = await db.query(
        `SELECT u.id, u.name, u.email, u.role, u.active, u.deleted_at, u.created_at,
                COALESCE((SELECT sum(xp) FROM daily_activity d WHERE d.user_id = u.id), 0)::int AS xp
           FROM users u ORDER BY u.deleted_at IS NOT NULL, u.id`,
      );
      return rows;
    },
    /** Mention/invite search over live, active accounts (name or email prefix/substring). */
    async search(q, excludeId, limit = 8) {
      const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      const { rows } = await db.query(
        `SELECT id, name, avatar_url FROM users
          WHERE deleted_at IS NULL AND active AND id <> $2 AND (name ILIKE $1 OR email ILIKE $1)
          ORDER BY (name ILIKE $3) DESC, name LIMIT $4`,
        [like, excludeId ?? 0, `${q.replace(/[\\%_]/g, '\\$&')}%`, limit],
      );
      return rows;
    },
    async findPublicByIds(ids) {
      if (!ids.length) return [];
      const { rows } = await db.query('SELECT id, name, avatar_url FROM users WHERE id = ANY($1::int[]) AND deleted_at IS NULL', [ids]);
      return rows;
    },
    async activeAdminIds() {
      const { rows } = await db.query("SELECT id FROM users WHERE role = 'admin' AND active AND deleted_at IS NULL");
      return rows.map((r) => r.id);
    },
    async activeUserIds() {
      const { rows } = await db.query('SELECT id FROM users WHERE active AND deleted_at IS NULL');
      return rows.map((r) => r.id);
    },
    setRole: (id, role) => one('UPDATE users SET role = $2 WHERE id = $1 RETURNING id', [id, role]),
    setActive: (id, active) => one('UPDATE users SET active = $2 WHERE id = $1 RETURNING id', [id, active]),
    softDelete: (id) => one('UPDATE users SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [id]),
    restore: (id) => one('UPDATE users SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id', [id]),
    setPasswordHash: (id, hash) => one('UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id', [id, hash]),
    setName: (id, name) => one('UPDATE users SET name = $2 WHERE id = $1 RETURNING id', [id, name]),
  };
}
