/** SQL for topics, lessons, full-text search, docs-path resolving and lesson notes. */
export function createContentRepository(db) {
  return {
    /** Every topic with lesson/section counts (a parent counts its children too) and the user's finished sessions.
     * Quiz-kind lessons (whole quiz-*.md files) are excluded: they already surface through the dedicated
     * quiz practice feature (built straight from `cards`), so counting them here would double them. */
    async topicStats(userId) {
      const { rows } = await db.query(
        `SELECT t.id, t.slug, t.title, t.description, t.icon, t.parent_id,
                count(DISTINCT l.id)::int AS lessons,
                count(DISTINCT l.id) FILTER (WHERE l.level = 1)::int AS easy,
                count(DISTINCT l.id) FILTER (WHERE l.level = 2)::int AS medium,
                count(DISTINCT l.id) FILTER (WHERE l.level = 3)::int AS hard,
                count(s.id)::int AS sections, count(p.section_id)::int AS done
           FROM topics t
           LEFT JOIN topics c ON c.id = t.id OR c.parent_id = t.id
           LEFT JOIN lessons l ON l.topic_id = c.id AND l.kind <> 'quiz'
           LEFT JOIN sections s ON s.lesson_id = l.id
           LEFT JOIN progress_sections p ON p.section_id = s.id AND p.user_id = $1
          GROUP BY t.id ORDER BY t.sort_order, t.id`,
        [userId],
      );
      return rows;
    },
    async findTopic(slug) {
      const { rows } = await db.query('SELECT id, slug, title, description, icon, intro_md, parent_id FROM topics WHERE slug = $1', [slug]);
      return rows[0] ?? null;
    },
    /** Quiz-kind lessons are left out: they already surface through the dedicated quiz practice feature. */
    async topicLessons(topicId, userId) {
      const { rows } = await db.query(
        `SELECT l.id, l.title, l.kind, l.level, l.minutes, l.ord, l.summary, l.path,
                (SELECT count(*) FROM cards c WHERE c.lesson_id = l.id)::int AS cards,
                count(s.id)::int AS sections, count(p.section_id)::int AS done
           FROM lessons l LEFT JOIN sections s ON s.lesson_id = l.id
           LEFT JOIN progress_sections p ON p.section_id = s.id AND p.user_id = $2
          WHERE l.topic_id = $1 AND l.kind <> 'quiz' GROUP BY l.id ORDER BY l.ord, l.id`,
        [topicId, userId],
      );
      return rows;
    },

    async findLesson(id) {
      const { rows } = await db.query(
        `SELECT l.id, l.title, l.kind, l.level, l.minutes, l.path, l.summary, l.topic_id, l.ord,
                t.slug AS topic_slug, t.title AS topic_title
           FROM lessons l JOIN topics t ON t.id = l.topic_id WHERE l.id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },
    async lessonSections(lessonId, userId) {
      const { rows } = await db.query(
        `SELECT s.id, s.ord, s.heading, s.body_md, s.minutes, (p.section_id IS NOT NULL) AS done
           FROM sections s LEFT JOIN progress_sections p ON p.section_id = s.id AND p.user_id = $2
          WHERE s.lesson_id = $1 ORDER BY s.ord`,
        [lessonId, userId],
      );
      return rows;
    },
    async cardCounts(lessonId, userId) {
      const { rows } = await db.query(
        `SELECT count(*)::int AS total, count(cs.card_id)::int AS in_basket
           FROM cards c LEFT JOIN card_states cs ON cs.card_id = c.id AND cs.user_id = $2
          WHERE c.lesson_id = $1`,
        [lessonId, userId],
      );
      return rows[0];
    },
    /** Neighbouring lessons of the same topic in reading order. */
    async neighbours(topicId, ord) {
      const q = async (cmp, dir) => (await db.query(
        `SELECT id, title FROM lessons WHERE topic_id = $1 AND ord ${cmp} $2 ORDER BY ord ${dir} LIMIT 1`, [topicId, ord],
      )).rows[0] ?? null;
      return { prev: await q('<', 'DESC'), next: await q('>', 'ASC') };
    },

    /** Best section per lesson for an accent-insensitive prefix query (`tsQuery` is already built). */
    async search(tsQuery, limit) {
      const { rows } = await db.query(
        `SELECT * FROM (
           SELECT DISTINCT ON (l.id) l.id AS lesson_id, l.title AS lesson_title, l.level, t.title AS topic_title,
                  s.ord, s.heading, left(regexp_replace(s.body_md, '\\s+', ' ', 'g'), 160) AS snippet,
                  ts_rank(s.search, q.query) AS rank
             FROM sections s JOIN lessons l ON l.id = s.lesson_id JOIN topics t ON t.id = l.topic_id,
                  to_tsquery('simple', unaccent($1)) AS q(query)
            WHERE s.search @@ q.query
            ORDER BY l.id, rank DESC) r
         ORDER BY rank DESC LIMIT $2`,
        [tsQuery, limit],
      );
      return rows;
    },

    async lessonIdByPath(path) {
      const { rows } = await db.query('SELECT id FROM lessons WHERE path = $1 OR lower(path) = lower($1) LIMIT 1', [path]);
      return rows[0]?.id ?? null;
    },
    async topicSlugByPath(path) {
      const { rows } = await db.query('SELECT slug FROM topics WHERE path = $1 OR lower(path) = lower($1) LIMIT 1', [path]);
      return rows[0]?.slug ?? null;
    },

    async listNotes(userId) {
      const { rows } = await db.query(
        `SELECT n.lesson_id, l.title AS lesson_title, n.body, n.updated_at FROM notes n JOIN lessons l ON l.id = n.lesson_id
          WHERE n.user_id = $1 AND n.body <> '' ORDER BY n.updated_at DESC`,
        [userId],
      );
      return rows;
    },
    async getNote(userId, lessonId) {
      const { rows } = await db.query('SELECT lesson_id, body, updated_at FROM notes WHERE user_id = $1 AND lesson_id = $2', [userId, lessonId]);
      return rows[0] ?? null;
    },
    async saveNote(userId, lessonId, body) {
      const { rows } = await db.query(
        `INSERT INTO notes (user_id, lesson_id, body) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, lesson_id) DO UPDATE SET body = EXCLUDED.body, updated_at = now()
         RETURNING lesson_id, body, updated_at`,
        [userId, lessonId, body],
      );
      return rows[0];
    },
    async deleteNote(userId, lessonId) {
      await db.query('DELETE FROM notes WHERE user_id = $1 AND lesson_id = $2', [userId, lessonId]);
    },
  };
}
