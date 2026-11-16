/** SQL for study tracks and their day-by-day plans. Personal "daily-<userId>" tracks hold the generated daily list and are hidden. */

/** Per-day totals: sessions in the day's items and how many the user finished. Params: $1 = user. */
const dayStats = (where) => `
  SELECT d.id, d.track_id, d.day_no, d.title, d.minutes, count(s.id)::int AS total, count(p.section_id)::int AS done
    FROM plan_days d
    LEFT JOIN plan_day_items i ON i.day_id = d.id
    LEFT JOIN sections s ON s.lesson_id = i.lesson_id AND s.ord BETWEEN i.sec_from AND i.sec_to
    LEFT JOIN progress_sections p ON p.section_id = s.id AND p.user_id = $1
   ${where} GROUP BY d.id`;

const DAY_FILTER = `FROM plan_days d JOIN plan_day_items i ON i.day_id = d.id WHERE d.track_id = $1 AND d.day_no = $2`;

export function createTracksRepository(db) {
  return {
    /** Visible tracks with the user's state and day counts. */
    async list(userId) {
      const { rows } = await db.query(
        `WITH ds AS (${dayStats('')})
         SELECT t.id, t.slug, t.title, t.description, t.minutes_per_day, ut.started_at, COALESCE(ut.active, false) AS active,
                (SELECT count(*) FROM ds WHERE ds.track_id = t.id)::int AS days,
                (SELECT count(*) FROM ds WHERE ds.track_id = t.id AND ds.total > 0 AND ds.done >= ds.total)::int AS days_done
           FROM tracks t LEFT JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = $1
          WHERE t.slug NOT LIKE 'daily-%' ORDER BY t.sort_order, t.id`,
        [userId],
      );
      return rows;
    },
    async find(trackId, userId) {
      const { rows } = await db.query(
        `SELECT t.id, t.slug, t.title, t.description, t.minutes_per_day, ut.started_at, COALESCE(ut.active, false) AS active
           FROM tracks t LEFT JOIN user_tracks ut ON ut.track_id = t.id AND ut.user_id = $2
          WHERE t.id = $1 AND t.slug NOT LIKE 'daily-%'`,
        [trackId, userId],
      );
      return rows[0] ?? null;
    },
    /** Days of a track with progress and the topic/level of the first lesson (used to derive phases). */
    async days(trackId, userId) {
      const { rows } = await db.query(
        `WITH ds AS (${dayStats('WHERE d.track_id = $2')})
         SELECT ds.*, f.topic_title, f.level FROM ds
           LEFT JOIN LATERAL (SELECT tp.title AS topic_title, l.level FROM plan_day_items i
                                JOIN lessons l ON l.id = i.lesson_id JOIN topics tp ON tp.id = l.topic_id
                               WHERE i.day_id = ds.id ORDER BY i.ord LIMIT 1) f ON true
          ORDER BY ds.day_no`,
        [userId, trackId],
      );
      return rows;
    },
    /** The user's active track (header row), or null. */
    async activeTrack(userId) {
      const { rows } = await db.query(
        `SELECT t.id, t.slug, t.title, t.description, t.minutes_per_day, ut.started_at, true AS active
           FROM user_tracks ut JOIN tracks t ON t.id = ut.track_id WHERE ut.user_id = $1 AND ut.active`,
        [userId],
      );
      return rows[0] ?? null;
    },
    async dayRow(trackId, dayNo) {
      const { rows } = await db.query('SELECT id, day_no, title FROM plan_days WHERE track_id = $1 AND day_no = $2', [trackId, dayNo]);
      return rows[0] ?? null;
    },
    async dayItems(trackId, dayNo) {
      const { rows } = await db.query(
        `SELECT i.ord AS item_ord, i.lesson_id, l.title AS lesson_title, l.level, tp.title AS topic_title
           ${DAY_FILTER.replace('WHERE', 'JOIN lessons l ON l.id = i.lesson_id JOIN topics tp ON tp.id = l.topic_id WHERE')} ORDER BY i.ord`,
        [trackId, dayNo],
      );
      return rows;
    },
    async daySections(trackId, dayNo, userId) {
      const { rows } = await db.query(
        `SELECT i.ord AS item_ord, s.id, s.ord, s.heading, s.minutes, (p.section_id IS NOT NULL) AS done
           ${DAY_FILTER.replace('WHERE', 'JOIN sections s ON s.lesson_id = i.lesson_id AND s.ord BETWEEN i.sec_from AND i.sec_to LEFT JOIN progress_sections p ON p.section_id = s.id AND p.user_id = $3 WHERE')}
          ORDER BY i.ord, s.ord`,
        [trackId, dayNo, userId],
      );
      return rows;
    },
    /** Makes `trackId` the only active track of the user. */
    async activate(userId, trackId) {
      await db.tx(async (c) => {
        await c.query('UPDATE user_tracks SET active = false WHERE user_id = $1 AND active', [userId]);
        await c.query(
          `INSERT INTO user_tracks (user_id, track_id, active) VALUES ($1, $2, true)
           ON CONFLICT (user_id, track_id) DO UPDATE SET active = true`,
          [userId, trackId],
        );
      });
    },
    /** Track id of today's generated daily list for the user, or null when none was made today. */
    async dailyPlanTrack(userId) {
      const { rows } = await db.query(
        `SELECT t.id FROM tracks t JOIN plan_days d ON d.track_id = t.id AND d.day_no = 1
          WHERE t.slug = $1 AND d.title = current_date::text`,
        [`daily-${userId}`],
      );
      return rows[0]?.id ?? null;
    },
  };
}
