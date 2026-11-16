/** Data access for the public "Học thử" (try a lesson) section of the guest page. */
export function createPreviewRepository(db) {
  return {
    /** One easy lesson per topic (the first by order), for the featured cards. */
    async featured(limit) {
      const { rows } = await db.query(
        `SELECT * FROM (
           SELECT DISTINCT ON (t.id) l.id, l.title, l.level, l.minutes, l.summary, t.title AS topic_title
             FROM lessons l JOIN topics t ON t.id = l.topic_id
            WHERE l.kind = 'lesson' AND l.level = 1
            ORDER BY t.id, l.ord
         ) x ORDER BY topic_title LIMIT $1`,
        [limit],
      );
      return rows;
    },

    async lesson(id) {
      const { rows } = await db.query(
        `SELECT l.id, l.title, l.minutes, t.title AS topic_title,
                (SELECT count(*)::int FROM sections s WHERE s.lesson_id = l.id) AS sections
           FROM lessons l JOIN topics t ON t.id = l.topic_id
          WHERE l.id = $1 AND l.kind = 'lesson'`,
        [id],
      );
      return rows[0] ?? null;
    },

    async firstSections(lessonId, n) {
      const { rows } = await db.query(
        'SELECT ord, heading, body_md FROM sections WHERE lesson_id = $1 ORDER BY ord LIMIT $2',
        [lessonId, n],
      );
      return rows;
    },
  };
}
