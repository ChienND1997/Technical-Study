/** SQL for system announcements. */
export function createAnnouncementsRepository(db) {
  const live = 'active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())';
  const one = async (text, params) => (await db.query(text, params)).rows[0] ?? null;
  return {
    async listActive() {
      return (await db.query(`SELECT * FROM announcements WHERE ${live} ORDER BY starts_at DESC, id DESC`)).rows;
    },
    /** Announcements already published (including expired ones), newest first, for the bell list. */
    async listHistory(limit = 50) {
      return (await db.query('SELECT * FROM announcements WHERE active AND starts_at <= now() ORDER BY starts_at DESC, id DESC LIMIT $1', [limit])).rows;
    },
    async listAll() {
      return (await db.query('SELECT * FROM announcements ORDER BY created_at DESC, id DESC')).rows;
    },
    get: (id) => one('SELECT * FROM announcements WHERE id = $1', [id]),
    create: ({ kind, title, body, startsAt, endsAt, active, createdBy }) =>
      one(
        `INSERT INTO announcements (kind, title, body, starts_at, ends_at, active, created_by)
         VALUES ($1,$2,$3,COALESCE($4::timestamptz, now()),$5,$6,$7) RETURNING *`,
        [kind, title, body, startsAt ?? null, endsAt ?? null, active, createdBy],
      ),
    /** Replaces all editable fields (the service merges the patch onto the stored row first). */
    update: (id, { kind, title, body, startsAt, endsAt, active }) =>
      one('UPDATE announcements SET kind=$2, title=$3, body=$4, starts_at=$5, ends_at=$6, active=$7 WHERE id=$1 RETURNING *', [id, kind, title, body, startsAt, endsAt, active]),
    remove: (id) => one('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]),
  };
}
