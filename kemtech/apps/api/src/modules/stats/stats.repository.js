import { appTz } from '../activity/activity.repository.js';

/** Read-only SQL for the statistics page. Days are local dates in APP_TZ. */
export function createStatsRepository(db) {
  const tz = appTz;
  return {
    async today() {
      const { rows } = await db.query('SELECT (now() AT TIME ZONE $1)::date::text AS d', [tz()]);
      return rows[0].d;
    },
    /** Daily rows of the last `days` days. */
    async heat(userId, days) {
      const { rows } = await db.query(
        `SELECT day::text AS day, seconds, cards_reviewed, sections_done, xp FROM daily_activity
          WHERE user_id = $1 AND day > (now() AT TIME ZONE $2)::date - $3::int ORDER BY day`,
        [userId, tz(), days],
      );
      return rows;
    },
    async activeDays(userId) {
      const { rows } = await db.query(
        `SELECT day::text AS day FROM daily_activity
          WHERE user_id = $1 AND (seconds > 0 OR cards_reviewed > 0 OR sections_done > 0 OR xp > 0)`,
        [userId],
      );
      return rows.map((r) => r.day);
    },
    async totals(userId) {
      const { rows } = await db.query(
        `SELECT (SELECT count(*) FROM progress_sections WHERE user_id = $1)::int AS sections_done,
                (SELECT count(*) FROM sections)::int AS sections_total,
                COALESCE((SELECT sum(xp) FROM daily_activity WHERE user_id = $1), 0)::int AS xp,
                COALESCE((SELECT sum(seconds) FROM daily_activity WHERE user_id = $1), 0)::int AS seconds,
                (SELECT count(*) FROM card_states WHERE user_id = $1)::int AS basket,
                (SELECT count(*) FROM card_states WHERE user_id = $1 AND state = 'review' AND interval_minutes >= 10080)::int AS mature,
                (SELECT count(*) FROM review_logs WHERE user_id = $1)::int AS reviews,
                (SELECT count(*) FROM cards WHERE kind <> 'quiz')::int AS cards_total`,
        [userId],
      );
      return rows[0];
    },
    /** Per top-level topic (children included): sections done / total, basket cards and "strong" cards (interval >= 7 days). */
    async topics(userId) {
      const { rows } = await db.query(
        `SELECT t.slug, t.title,
                (SELECT count(*) FROM sections s JOIN lessons l ON l.id = s.lesson_id JOIN topics c ON c.id = l.topic_id
                  WHERE c.id = t.id OR c.parent_id = t.id)::int AS sections,
                (SELECT count(*) FROM progress_sections p JOIN sections s ON s.id = p.section_id JOIN lessons l ON l.id = s.lesson_id JOIN topics c ON c.id = l.topic_id
                  WHERE p.user_id = $1 AND (c.id = t.id OR c.parent_id = t.id))::int AS done,
                (SELECT count(*) FROM card_states cs JOIN cards k ON k.id = cs.card_id JOIN lessons l ON l.id = k.lesson_id JOIN topics c ON c.id = l.topic_id
                  WHERE cs.user_id = $1 AND (c.id = t.id OR c.parent_id = t.id))::int AS basket,
                (SELECT count(*) FROM card_states cs JOIN cards k ON k.id = cs.card_id JOIN lessons l ON l.id = k.lesson_id JOIN topics c ON c.id = l.topic_id
                  WHERE cs.user_id = $1 AND (c.id = t.id OR c.parent_id = t.id) AND cs.state = 'review' AND cs.interval_minutes >= 10080)::int AS strong
           FROM topics t WHERE t.parent_id IS NULL ORDER BY t.sort_order, t.id`,
        [userId],
      );
      return rows;
    },
    async dayActivity(userId, day) {
      const { rows } = await db.query(
        'SELECT seconds, cards_reviewed, sections_done, xp FROM daily_activity WHERE user_id = $1 AND day = $2::date', [userId, day]);
      return rows[0] ?? { seconds: 0, cards_reviewed: 0, sections_done: 0, xp: 0 };
    },
    /** Sections completed on `day`, with their lesson and topic. */
    async daySections(userId, day) {
      const { rows } = await db.query(
        `SELECT s.id, s.ord, s.heading, s.minutes, l.id AS lesson_id, l.title AS lesson_title, l.level, t.title AS topic_title
           FROM progress_sections p JOIN sections s ON s.id = p.section_id JOIN lessons l ON l.id = s.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE p.user_id = $1 AND (p.completed_at AT TIME ZONE $3)::date = $2::date
          ORDER BY p.completed_at`,
        [userId, day, tz()],
      );
      return rows;
    },
  };
}
