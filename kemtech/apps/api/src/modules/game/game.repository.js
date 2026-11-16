import { appTz } from '../activity/activity.repository.js';

/** SQL for XP totals, activity days and earned badges. */
export function createGameRepository(db) {
  return {
    async counters(userId, exec = db) {
      const { rows } = await exec.query(
        `SELECT
           COALESCE((SELECT sum(xp) FROM daily_activity WHERE user_id = $1), 0)::int AS xp,
           (SELECT count(*) FROM progress_sections WHERE user_id = $1)::int AS sections,
           (SELECT count(*) FROM review_logs WHERE user_id = $1)::int AS reviews,
           (SELECT count(*) FROM card_states WHERE user_id = $1)::int AS basket,
           (SELECT count(*) FROM card_states WHERE user_id = $1 AND state = 'review' AND interval_minutes >= 10080)::int AS mature,
           (SELECT count(*) FROM quiz_attempts WHERE user_id = $1 AND correct)::int AS quiz_correct,
           (SELECT count(*) FROM mock_sessions WHERE user_id = $1)::int AS mocks,
           (now() AT TIME ZONE $2)::date::text AS today`,
        [userId, appTz()],
      );
      const r = rows[0];
      return { xp: r.xp, sections: r.sections, reviews: r.reviews, basket: r.basket, mature: r.mature, quizCorrect: r.quiz_correct, mocks: r.mocks, today: r.today };
    },
    /** ISO dates with any study activity. */
    async activeDays(userId, exec = db) {
      const { rows } = await exec.query(
        `SELECT day::text AS day FROM daily_activity
          WHERE user_id = $1 AND (seconds > 0 OR cards_reviewed > 0 OR sections_done > 0 OR xp > 0)`,
        [userId],
      );
      return rows.map((r) => r.day);
    },
    async earned(userId, exec = db) {
      const { rows } = await exec.query('SELECT badge, earned_at FROM user_badges WHERE user_id = $1', [userId]);
      return rows;
    },
    async award(userId, badgeIds, exec = db) {
      if (!badgeIds.length) return;
      await exec.query(
        'INSERT INTO user_badges (user_id, badge) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING',
        [userId, badgeIds],
      );
    },
  };
}
