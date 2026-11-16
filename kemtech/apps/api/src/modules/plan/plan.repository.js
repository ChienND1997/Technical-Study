/** SQL for generating the user's daily study list (stored as a hidden one-day "daily-<userId>" track). */
export function createPlanRepository(db) {
  return {
    /** The goal saved in users.settings.goal, or null. */
    async getGoal(userId) {
      const { rows } = await db.query(`SELECT settings->'goal' AS goal FROM users WHERE id = $1`, [userId]);
      return rows[0]?.goal ?? null;
    },

    /** Unfinished sessions of lessons matching topic (slug, children included) and levels, lessons in random order. */
    async pickUndone(userId, { topic, levels, seed, limit = 300 }) {
      const { rows } = await db.query(
        `SELECT l.id AS lesson_id, s.ord, s.minutes
           FROM sections s JOIN lessons l ON l.id = s.lesson_id JOIN topics t ON t.id = l.topic_id
          WHERE l.kind IN ('lesson', 'guide')
            AND NOT EXISTS (SELECT 1 FROM progress_sections p WHERE p.section_id = s.id AND p.user_id = $1)
            AND ($2::text IS NULL OR t.slug = $2 OR t.parent_id = (SELECT id FROM topics WHERE slug = $2))
            AND ($3::int[] IS NULL OR l.level = ANY($3))
          ORDER BY md5(l.id::text || $4), s.ord LIMIT $5`,
        [userId, topic ?? null, levels ?? null, seed, limit],
      );
      return rows;
    },

    /** Replaces the user's daily list with one day holding `items` ({lessonId, secFrom, secTo}). */
    async savePlan(userId, { items, minutes }) {
      return db.tx(async (c) => {
        const t = await c.query(
          `INSERT INTO tracks (slug, title, description, minutes_per_day, sort_order) VALUES ($1, 'Bài của hôm nay', 'Danh sách bài tự chọn trong ngày', $2, 9999)
           ON CONFLICT (slug) DO UPDATE SET minutes_per_day = EXCLUDED.minutes_per_day RETURNING id`,
          [`daily-${userId}`, Math.max(minutes, 1)],
        );
        const trackId = t.rows[0].id;
        await c.query('DELETE FROM plan_day_items WHERE day_id IN (SELECT id FROM plan_days WHERE track_id = $1)', [trackId]);
        await c.query('DELETE FROM plan_days WHERE track_id = $1', [trackId]);
        const d = await c.query(
          `INSERT INTO plan_days (track_id, day_no, title, minutes) VALUES ($1, 1, current_date::text, $2) RETURNING id`,
          [trackId, minutes],
        );
        for (const [i, it] of items.entries()) {
          await c.query(
            'INSERT INTO plan_day_items (day_id, ord, lesson_id, sec_from, sec_to) VALUES ($1, $2, $3, $4, $5)',
            [d.rows[0].id, i, it.lessonId, it.secFrom, it.secTo],
          );
        }
        return { trackId, dayId: d.rows[0].id };
      });
    },
  };
}
