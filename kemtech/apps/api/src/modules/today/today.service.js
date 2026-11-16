import { summarize } from '../tracks/track-logic.js';
import { isActive, streaks } from './today.logic.js';

/** Snapshot shared by /today and /dashboard: streak, XP, due cards, goal, active track and its current day. */
export async function buildToday(repo, userId) {
  const [today, rows, totalXp, cards, goal, active] = await Promise.all([
    repo.today(), repo.activity(userId), repo.totalXp(userId), repo.cardCounts(userId), repo.goal(userId), repo.activeTrack(userId),
  ]);
  const { streak, bestStreak } = streaks(rows.filter(isActive).map((r) => r.day), today);
  const todayRow = rows.find((r) => r.day === today);

  let track = null, day = null;
  if (active) {
    const s = summarize(active, await repo.trackDays(active.id, userId));
    track = s.track;
    if (s.current) day = await repo.dayDetail(active.id, s.current.day_no, userId);
  }
  const data = {
    date: today, streak, bestStreak, doneToday: !!todayRow && isActive(todayRow), totalXp,
    minutesToday: Math.round((todayRow?.seconds ?? 0) / 60),
    reviewDue: cards.review_due, newDue: cards.new_due, basket: cards.basket, goal, track, day,
  };
  return { data, rows, today };
}

/** GET /today. */
export function createTodayService({ todayRepo }) {
  return { get: async (userId) => (await buildToday(todayRepo, userId)).data };
}
