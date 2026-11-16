// field order mirrors the original JSON: basket rows carry timestamps, queue rows carry extra + ease
const BASKET_FIELDS = `c.id, c.kind, c.front, c.back, c.lesson_id, l.title AS lesson_title, l.level, t.title AS topic_title,
       t.slug AS topic_slug, cs.state, cs.interval_minutes, cs.reps, cs.lapses, cs.due_at, cs.added_at`;
const QUEUE_FIELDS = `c.id, c.kind, c.front, c.back, c.extra, c.lesson_id, l.title AS lesson_title, t.title AS topic_title,
       t.slug AS topic_slug, l.level, cs.state, cs.interval_minutes, cs.ease, cs.reps, cs.lapses`;
const FROM = `card_states cs JOIN cards c ON c.id = cs.card_id JOIN lessons l ON l.id = c.lesson_id JOIN topics t ON t.id = l.topic_id`;
// topic filter accepts a topic slug or its parent group slug
const TOPIC = `($2::text IS NULL OR t.slug = $2 OR t.parent_id = (SELECT id FROM topics WHERE slug = $2))`;

/** SQL for the review basket (card_states) and review logs. */
export function createReviewRepository(db) {
  return {
    /** Adds cards (by ids and/or whole lessons) as new basket cards. Returns how many were actually added. */
    async addCards(userId, { cardIds = [], lessonId = null }, exec = db) {
      const { rowCount } = await exec.query(
        `INSERT INTO card_states (user_id, card_id)
         SELECT $1, c.id FROM cards c WHERE c.id = ANY($2::int[]) OR c.lesson_id = $3::int
         ON CONFLICT DO NOTHING`,
        [userId, cardIds, lessonId],
      );
      return rowCount;
    },
    async removeCards(userId, cardIds, exec = db) {
      const { rowCount } = await exec.query('DELETE FROM card_states WHERE user_id = $1 AND card_id = ANY($2::int[])', [userId, cardIds]);
      return rowCount;
    },
    /** Counts of the basket by status (optionally within a topic). */
    async counts(userId, topic, exec = db) {
      const { rows } = await exec.query(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE cs.state = 'new')::int AS new,
                count(*) FILTER (WHERE cs.state <> 'new' AND cs.due_at <= now())::int AS due,
                count(*) FILTER (WHERE cs.state = 'learning')::int AS learning,
                count(*) FILTER (WHERE cs.state = 'review' AND cs.interval_minutes >= 10080)::int AS strong
           FROM ${FROM} WHERE cs.user_id = $1 AND ${TOPIC}`,
        [userId, topic ?? null],
      );
      return rows[0];
    },
    async listBasket(userId, { status, topic, offset, limit }, exec = db) {
      const where = {
        all: 'TRUE', new: `cs.state = 'new'`, due: `cs.state <> 'new' AND cs.due_at <= now()`,
        learning: `cs.state = 'learning'`, strong: `cs.state = 'review' AND cs.interval_minutes >= 10080`,
      }[status] ?? 'TRUE';
      const { rows } = await exec.query(
        `SELECT ${BASKET_FIELDS}, (cs.state <> 'new' AND cs.due_at <= now()) AS is_due
           FROM ${FROM} WHERE cs.user_id = $1 AND ${TOPIC} AND ${where}
          ORDER BY cs.added_at DESC, c.id
          OFFSET $3 LIMIT $4`,
        [userId, topic ?? null, offset, limit],
      );
      return rows;
    },
    /** Due basket cards: learning first, then reviews by due date, then new cards. */
    async dueQueue(userId, { topic, limit }, exec = db) {
      const { rows } = await exec.query(
        `SELECT ${QUEUE_FIELDS} FROM ${FROM}
          WHERE cs.user_id = $1 AND ${TOPIC} AND cs.due_at <= now()
          ORDER BY (cs.state = 'new'), cs.due_at LIMIT $3`,
        [userId, topic ?? null, limit],
      );
      return rows;
    },
    async dueTotal(userId, topic, exec = db) {
      const { rows } = await exec.query(
        `SELECT count(*)::int AS n FROM ${FROM} WHERE cs.user_id = $1 AND ${TOPIC} AND cs.due_at <= now()`, [userId, topic ?? null]);
      return rows[0].n;
    },
    /** Locks and returns the user's state row for a card. */
    async getState(userId, cardId, exec = db) {
      const { rows } = await exec.query(
        `SELECT state, interval_minutes, ease, reps, lapses FROM card_states WHERE user_id = $1 AND card_id = $2 FOR UPDATE`, [userId, cardId]);
      return rows[0] ?? null;
    },
    async saveState(userId, cardId, s, exec = db) {
      await exec.query(
        `UPDATE card_states SET state = $3, due_at = $4, interval_minutes = $5, ease = $6, reps = $7, lapses = $8, last_reviewed_at = now()
          WHERE user_id = $1 AND card_id = $2`,
        [userId, cardId, s.state, s.due_at, s.interval_minutes, s.ease, s.reps, s.lapses],
      );
    },
    async insertLog(userId, { cardId, rating, direction, prevInterval, newInterval, durationMs }, exec = db) {
      await exec.query(
        `INSERT INTO review_logs (user_id, card_id, rating, direction, prev_interval, new_interval, duration_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [userId, cardId, rating, direction, prevInterval, newInterval, durationMs ?? null],
      );
    },
  };
}
