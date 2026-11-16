/** Read-only SQL behind the practice suggestions. */
export function createPracticeRepository(db) {
  return {
    /** A random Q&A card for the "did you know?" teaser. */
    async randomTeaser() {
      const { rows } = await db.query(
        `SELECT c.id, c.front, c.back, c.lesson_id, l.title AS lesson_title, t.title AS topic_title
           FROM cards c JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE c.kind = 'qa' AND length(c.back) BETWEEN 15 AND 420 ORDER BY random() LIMIT 1`,
      );
      return rows[0] ?? null;
    },
    /** Wrong quiz answers in the last 30 days per topic. */
    async wrongQuizByTopic(userId) {
      const { rows } = await db.query(
        `SELECT t.slug, t.title, t.icon, count(*)::int AS wrong
           FROM quiz_attempts q JOIN cards c ON c.id = q.card_id JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE q.user_id = $1 AND NOT q.correct AND q.answered_at > now() - interval '30 days'
          GROUP BY t.id`,
        [userId],
      );
      return rows;
    },
    /** Weak (score 0-1) mock answers in the last 30 days per topic. */
    async weakMockByTopic(userId) {
      const { rows } = await db.query(
        `SELECT t.slug, t.title, t.icon, count(*)::int AS wrong
           FROM mock_answers a JOIN mock_sessions m ON m.id = a.session_id
                JOIN cards c ON c.id = a.card_id JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE m.user_id = $1 AND a.score <= 1 AND m.started_at > now() - interval '30 days'
          GROUP BY t.id`,
        [userId],
      );
      return rows;
    },
    /** Topics with cards the user has never reviewed (not in the basket or still unreviewed). */
    async untouchedTopics(userId) {
      const { rows } = await db.query(
        `SELECT t.slug, t.title, t.icon, count(*)::int AS cards
           FROM cards c JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id
           LEFT JOIN card_states cs ON cs.card_id = c.id AND cs.user_id = $1
          WHERE c.kind IN ('qa','quiz') AND (cs.card_id IS NULL OR cs.reps = 0)
          GROUP BY t.id HAVING count(*) > 0`,
        [userId],
      );
      return rows;
    },
    /** Basket cards never studied. */
    async newBasketCount(userId) {
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM card_states WHERE user_id = $1 AND state = 'new'`, [userId]);
      return rows[0].n;
    },
    /** Cards due for review right now (new or already-learned), for the "Flashcard ôn tập" mode badge. */
    async dueCount(userId) {
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM card_states WHERE user_id = $1 AND due_at <= now()`, [userId]);
      return rows[0].n;
    },
    /** Cards whose latest quiz attempt was wrong, for the "Sổ câu sai" mode badge. */
    async wrongCount(userId) {
      const { rows } = await db.query(
        `SELECT count(*)::int AS n FROM (
           SELECT DISTINCT ON (card_id) card_id, correct FROM quiz_attempts WHERE user_id = $1 ORDER BY card_id, answered_at DESC) w
          WHERE NOT w.correct`,
        [userId],
      );
      return rows[0].n;
    },
  };
}
