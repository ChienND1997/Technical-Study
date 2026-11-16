import { createTodayRepository } from '../today/today.repository.js';
import { createTracksRepository } from '../tracks/tracks.repository.js';

/** Today's snapshot plus the dashboard-only parts: daily list, recent history, topic progress. */
export function createDashboardRepository(db) {
  const base = createTodayRepository(db);
  const tracks = createTracksRepository(db);
  return {
    ...base,
    /** Today's generated study list (a day of the hidden daily track), or null when none was made today. */
    async dailyPlan(userId) {
      const trackId = await tracks.dailyPlanTrack(userId);
      return trackId ? base.dayDetail(trackId, 1, userId) : null;
    },
    /** Sessions finished in the last 14 days, grouped by day and lesson. */
    async recentSessions(userId) {
      const { rows } = await db.query(
        `SELECT p.completed_at::date::text AS day, l.id AS lesson_id, l.title, t.title AS topic,
                count(*)::int AS sections, COALESCE(sum(s.minutes), 0)::int AS minutes
           FROM progress_sections p JOIN sections s ON s.id = p.section_id JOIN lessons l ON l.id = s.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE p.user_id = $1 AND p.completed_at >= current_date - 14
          GROUP BY 1, l.id, t.title ORDER BY 1 DESC, max(p.completed_at) DESC`,
        [userId],
      );
      return rows;
    },
    /**
     * Top-level topics with finished/total sessions. With an active track, scoped to exactly the
     * topics that track's plan actually covers, ordered the way the learner will reach them (by the
     * day each topic first shows up) — so the card matches "what I'm currently studying" instead of
     * an unrelated most-progressed ranking. Without a track, falls back to most progressed first.
     */
    async topicProgress(userId, trackId) {
      if (trackId) {
        const { rows } = await db.query(
          `WITH track_topics AS (
             SELECT top.id, top.slug, top.title, min(d.day_no) AS first_day
               FROM plan_day_items i
               JOIN plan_days d ON d.id = i.day_id
               JOIN lessons l ON l.id = i.lesson_id
               JOIN topics c ON c.id = l.topic_id
               JOIN topics top ON top.id = COALESCE(c.parent_id, c.id)
              WHERE d.track_id = $2
              GROUP BY top.id, top.slug, top.title
           )
           SELECT tt.slug, tt.title, count(s.id)::int AS total, count(p.section_id)::int AS done
             FROM track_topics tt
             JOIN topics c2 ON c2.id = tt.id OR c2.parent_id = tt.id
             JOIN lessons l2 ON l2.topic_id = c2.id JOIN sections s ON s.lesson_id = l2.id
             LEFT JOIN progress_sections p ON p.section_id = s.id AND p.user_id = $1
            GROUP BY tt.id, tt.slug, tt.title, tt.first_day HAVING count(s.id) > 0
            ORDER BY tt.first_day, tt.slug`,
          [userId, trackId],
        );
        return rows;
      }
      const { rows } = await db.query(
        `SELECT t.slug, t.title, count(s.id)::int AS total, count(p.section_id)::int AS done
           FROM topics t JOIN topics c ON c.id = t.id OR c.parent_id = t.id
           JOIN lessons l ON l.topic_id = c.id JOIN sections s ON s.lesson_id = l.id
           LEFT JOIN progress_sections p ON p.section_id = s.id AND p.user_id = $1
          WHERE t.parent_id IS NULL GROUP BY t.id HAVING count(s.id) > 0
          ORDER BY count(p.section_id) DESC, t.sort_order LIMIT 12`,
        [userId],
      );
      return rows;
    },
  };
}
