import { createTracksRepository } from '../tracks/tracks.repository.js';
import { assembleDay } from '../tracks/track-logic.js';
import { normalizeGoal } from '../plan/plan.service.js';

/** SQL for the "today" snapshot: activity history, XP, due cards, goal and the active track. */
export function createTodayRepository(db) {
  const tracks = createTracksRepository(db);
  return {
    /** One track day with its lessons and sessions. */
    async dayDetail(trackId, dayNo, userId) {
      const day = await tracks.dayRow(trackId, dayNo);
      if (!day) return null;
      const [items, sections] = await Promise.all([tracks.dayItems(trackId, dayNo), tracks.daySections(trackId, dayNo, userId)]);
      return assembleDay(day, items, sections);
    },
    async today() {
      const { rows } = await db.query('SELECT current_date::text AS d');
      return rows[0].d;
    },
    /** Daily activity of the last `days` days. */
    async activity(userId, days = 400) {
      const { rows } = await db.query(
        `SELECT day::text AS day, seconds, sections_done, cards_reviewed, xp FROM daily_activity
          WHERE user_id = $1 AND day > current_date - $2::int ORDER BY day`,
        [userId, days],
      );
      return rows;
    },
    async totalXp(userId) {
      const { rows } = await db.query('SELECT COALESCE(sum(xp), 0)::int AS xp FROM daily_activity WHERE user_id = $1', [userId]);
      return rows[0].xp;
    },
    async cardCounts(userId) {
      const { rows } = await db.query(
        `SELECT count(*) FILTER (WHERE state <> 'new' AND due_at <= now())::int AS review_due,
                count(*) FILTER (WHERE state = 'new' AND due_at <= now())::int AS new_due,
                count(*)::int AS basket
           FROM card_states WHERE user_id = $1`,
        [userId],
      );
      return rows[0];
    },
    async goal(userId) {
      const { rows } = await db.query(`SELECT settings->'goal' AS goal FROM users WHERE id = $1`, [userId]);
      return normalizeGoal(rows[0]?.goal);
    },
    activeTrack: (userId) => tracks.activeTrack(userId),
    trackDays: (trackId, userId) => tracks.days(trackId, userId),
  };
}
