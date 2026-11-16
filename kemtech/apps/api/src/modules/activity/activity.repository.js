/** Timezone that defines "today" for streaks and daily activity. */
export const appTz = () => process.env.APP_TZ || 'Asia/Ho_Chi_Minh';

/** SQL for daily_activity: one accumulating row per user and local day. */
export function createActivityRepository(db) {
  return {
    /** Adds the given amounts to today's row (created on first use). */
    async bump(userId, { seconds = 0, xp = 0, cardsReviewed = 0, sectionsDone = 0 }, exec = db) {
      await exec.query(
        `INSERT INTO daily_activity (user_id, day, seconds, xp, cards_reviewed, sections_done)
         VALUES ($1, (now() AT TIME ZONE $2)::date, $3, $4, $5, $6)
         ON CONFLICT (user_id, day) DO UPDATE SET
           seconds = daily_activity.seconds + EXCLUDED.seconds,
           xp = daily_activity.xp + EXCLUDED.xp,
           cards_reviewed = daily_activity.cards_reviewed + EXCLUDED.cards_reviewed,
           sections_done = GREATEST(0, daily_activity.sections_done + EXCLUDED.sections_done)`,
        [userId, appTz(), seconds, xp, cardsReviewed, sectionsDone],
      );
    },
    /** Generic activity log entry: only its XP is kept. */
    record(userId, _type, xp = 0, _details, exec = db) {
      return this.bump(userId, { xp }, exec);
    },
  };
}
