/** SQL for the profile page: goal (users.settings.goal), XP/streak (daily_activity) and badges. */
export function createProfileRepository(db) {
  return {
    async getSettings(userId) {
      return (await db.query('SELECT settings FROM users WHERE id = $1', [userId])).rows[0]?.settings ?? {};
    },
    async saveGoal(userId, goal) {
      await db.query("UPDATE users SET settings = jsonb_set(COALESCE(settings,'{}'::jsonb), '{goal}', $2::jsonb) WHERE id = $1", [userId, JSON.stringify(goal)]);
    },
    async totalXp(userId) {
      return (await db.query('SELECT COALESCE(sum(xp),0)::int AS xp FROM daily_activity WHERE user_id = $1', [userId])).rows[0].xp;
    },
    /** Days (YYYY-MM-DD, newest first) with any activity, last 400 days. */
    async activeDays(userId) {
      const { rows } = await db.query(
        `SELECT to_char(day,'YYYY-MM-DD') AS day FROM daily_activity
          WHERE user_id = $1 AND (seconds > 0 OR xp > 0 OR cards_reviewed > 0 OR sections_done > 0) ORDER BY day DESC LIMIT 400`,
        [userId],
      );
      return rows.map((r) => r.day);
    },
    async badges(userId) {
      return (await db.query('SELECT badge FROM user_badges WHERE user_id = $1 ORDER BY earned_at', [userId])).rows.map((r) => r.badge);
    },
  };
}
