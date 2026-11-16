/** SQL for the notifications table. */
export function createNotificationRepository(db) {
  const COLS = 'id, user_id, actor_id, type, text, link, read_at, created_at, ref_id, count';
  return {
    /** Newest first; group invites carry the live status of their invite (the bell shows accept/decline while pending). */
    async list(userId, limit = 100) {
      const { rows } = await db.query(
        `SELECT n.id, n.type, n.text, n.link, n.read_at, n.created_at, n.ref_id, n.count, n.actor_id,
                CASE WHEN n.type = 'group_invite' THEN (SELECT i.status FROM group_invites i WHERE i.id = n.ref_id) END AS ref_status
           FROM notifications n WHERE n.user_id = $1 ORDER BY n.created_at DESC, n.id DESC LIMIT $2`,
        [userId, limit],
      );
      return rows;
    },
    async unreadCount(userId) {
      const { rows } = await db.query('SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL', [userId]);
      return rows[0].count;
    },
    async insert({ userId, actorId = null, type, text, link = null, refId = null, count = 1 }) {
      const { rows } = await db.query(
        `INSERT INTO notifications (user_id, actor_id, type, text, link, ref_id, count) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
        [userId, actorId, type, text, link, refId, count],
      );
      return rows[0];
    },
    /** The most recent notification of this user/type/ref that a new event can be merged into, read or not. */
    async findGroup(userId, type, refId) {
      const { rows } = await db.query(
        `SELECT ${COLS} FROM notifications WHERE user_id = $1 AND type = $2 AND ref_id = $3 ORDER BY id DESC LIMIT 1`,
        [userId, type, refId],
      );
      return rows[0] ?? null;
    },
    /** Bumping always surfaces the notification as unread again, even if it had already been read. */
    async bump(id, { actorId, text, count }) {
      const { rows } = await db.query(
        `UPDATE notifications SET count = $2, text = $3, actor_id = $4, created_at = now(), read_at = NULL WHERE id = $1 RETURNING ${COLS}`,
        [id, count, text, actorId],
      );
      return rows[0];
    },
    /** Marks the given ids (or every unread one when ids is null) as read. */
    async markRead(userId, ids) {
      const { rowCount } = await db.query(
        `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL AND ($2::bigint[] IS NULL OR id = ANY($2::bigint[]))`,
        [userId, ids],
      );
      return rowCount;
    },
    async markGroupRead(userId, groupId) {
      const { rowCount } = await db.query(
        `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND type = 'group_message' AND ref_id = $2 AND read_at IS NULL`,
        [userId, groupId],
      );
      return rowCount;
    },
    async remove(userId, id) {
      const { rowCount } = await db.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
      return rowCount > 0;
    },
    async clear(userId) {
      await db.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    },
  };
}
