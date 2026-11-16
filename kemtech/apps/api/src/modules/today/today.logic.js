/** Pure date/streak helpers (days are 'YYYY-MM-DD' strings). */

const num = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
const str = (n) => new Date(n * 86400000).toISOString().slice(0, 10);

/** Adds `n` days to a 'YYYY-MM-DD' string. */
export const addDays = (s, n) => str(num(s) + n);

/** A day counts as learning when anything was done. */
export const isActive = (r) => r.seconds > 0 || r.sections_done > 0 || r.cards_reviewed > 0;

/** Current streak (alive until the end of today) and the best streak ever. */
export function streaks(activeDays, today) {
  const set = new Set(activeDays);
  let cur = 0;
  for (let d = set.has(today) ? today : addDays(today, -1); set.has(d); d = addDays(d, -1)) cur++;
  let best = 0, run = 0, prev = null;
  for (const d of [...set].sort()) {
    run = prev !== null && num(d) === num(prev) + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { streak: cur, bestStreak: best };
}

const minutesOf = (r) => Math.round((r?.seconds ?? 0) / 60);

/** Last 7 days ending today: [{ day, minutes }]. */
export function lastWeek(rows, today) {
  const by = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: 7 }, (_, i) => { const day = addDays(today, i - 6); return { day, minutes: minutesOf(by.get(day)) }; });
}

/** Calendar week (Monday to Sunday) containing today. */
export function weekCal(rows, today) {
  const by = new Map(rows.map((r) => [r.day, r]));
  const monday = addDays(today, -((new Date(num(today) * 86400000).getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    const r = by.get(day);
    return { day, active: !!r && isActive(r), minutes: minutesOf(r), today: day === today, future: day > today };
  });
}
