/** SQL for community blog posts and their comments (posts and curated lessons). */
export function createBlogRepository(db) {
  const POST = `p.id, p.user_id, p.title, p.summary, p.body, p.source_url, p.category, p.status, p.reject_reason,
                p.created_at, p.updated_at, u.name AS author`;
  const FROM = 'FROM blog_posts p JOIN users u ON u.id = p.user_id';
  return {
    async listApproved() {
      const { rows } = await db.query(`SELECT ${POST} ${FROM} WHERE p.status = 'approved' ORDER BY p.created_at DESC`);
      return rows;
    },
    async listByUser(userId) {
      const { rows } = await db.query(`SELECT ${POST} ${FROM} WHERE p.user_id = $1 ORDER BY p.created_at DESC`, [userId]);
      return rows;
    },
    async get(id) {
      const { rows } = await db.query(`SELECT ${POST} ${FROM} WHERE p.id = $1`, [id]);
      return rows[0] ?? null;
    },
    async insert(userId, { title, summary, body, sourceUrl, category }, status) {
      const { rows } = await db.query(
        `INSERT INTO blog_posts (user_id, title, summary, body, source_url, category, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, status`,
        [userId, title, summary, body, sourceUrl, category, status],
      );
      return rows[0];
    },
    /** Updates content and moves the post to `status`; a re-queued post loses its old reject reason. */
    async update(id, { title, summary, body, sourceUrl, category }, status) {
      const { rows } = await db.query(
        `UPDATE blog_posts SET title=$2, summary=$3, body=$4, source_url=$5, category=$6, status=$7,
                reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, updated_at=now()
          WHERE id=$1 RETURNING id, status`,
        [id, title, summary, body, sourceUrl, category, status],
      );
      return rows[0];
    },
    async remove(id) {
      await db.query(`DELETE FROM blog_comments WHERE target_type = 'post' AND target_id = $1`, [id]);
      await db.query('DELETE FROM blog_posts WHERE id = $1', [id]);
    },

    // ---- moderation
    async listByStatus(status) {
      const { rows } = await db.query(
        `SELECT p.id, p.user_id, p.title, p.summary, p.category, p.status, p.reject_reason, p.created_at, u.name AS author
           ${FROM} WHERE p.status = $1 ORDER BY p.created_at DESC`,
        [status],
      );
      return rows;
    },
    async pendingCount() {
      const { rows } = await db.query(`SELECT count(*)::int AS count FROM blog_posts WHERE status = 'pending'`);
      return rows[0].count;
    },
    async setReview(id, adminId, status, reason) {
      await db.query(
        `UPDATE blog_posts SET status=$2, reject_reason=$3, reviewed_by=$4, reviewed_at=now(), updated_at=now() WHERE id=$1`,
        [id, status, reason, adminId],
      );
    },

    // ---- comments
    async lessonTitle(id) {
      const { rows } = await db.query('SELECT title FROM lessons WHERE id = $1', [id]);
      return rows[0]?.title ?? null;
    },
    async listComments(type, id) {
      const { rows } = await db.query(
        `SELECT c.id, c.user_id, c.body, c.mentions, c.created_at, u.name AS author, u.avatar_url,
                (u.role = 'admin') AS is_admin,
                (NOT u.active OR u.deleted_at IS NOT NULL) AS author_blocked,
                (c.target_type = 'post' AND c.user_id = (SELECT p.user_id FROM blog_posts p WHERE p.id = c.target_id)) AS is_author,
                COALESCE((SELECT sum(xp) FROM daily_activity d WHERE d.user_id = u.id), 0)::int AS author_xp
           FROM blog_comments c JOIN users u ON u.id = c.user_id
          WHERE c.target_type = $1 AND c.target_id = $2 ORDER BY c.created_at, c.id`,
        [type, id],
      );
      return rows;
    },
    async addComment(userId, type, id, body, mentions) {
      const { rows } = await db.query(
        `INSERT INTO blog_comments (user_id, target_type, target_id, body, mentions) VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING id, user_id, body, mentions, created_at`,
        [userId, type, id, body, JSON.stringify(mentions)],
      );
      return rows[0];
    },
    /** Everyone (other than `excludeUserId`) who already has a comment on this target, so they can be told about new activity in a thread they joined. */
    async priorCommenters(type, id, excludeUserId) {
      const { rows } = await db.query(
        'SELECT DISTINCT user_id FROM blog_comments WHERE target_type = $1 AND target_id = $2 AND user_id <> $3',
        [type, id, excludeUserId],
      );
      return rows.map((r) => r.user_id);
    },
    async getComment(id) {
      const { rows } = await db.query('SELECT id, user_id FROM blog_comments WHERE id = $1', [id]);
      return rows[0] ?? null;
    },
    async removeComment(id) {
      await db.query('DELETE FROM blog_comments WHERE id = $1', [id]);
    },
  };
}
