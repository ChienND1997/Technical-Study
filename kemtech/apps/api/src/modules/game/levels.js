const TITLES = ['Tân binh', 'Học việc', 'Chăm chỉ', 'Thực hành', 'Vững vàng', 'Thành thạo', 'Chuyên gia', 'Bậc thầy', 'Huyền thoại'];

/** Total XP needed to reach `level` (level 1 = 0, 2 = 50, 3 = 200, 4 = 450, ...). */
export const xpForLevel = (level) => 50 * (level - 1) ** 2;

/** Level, title and progress bar numbers for a total XP. */
export function levelInfo(xp) {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= total) level++;
  const base = xpForLevel(level);
  const span = xpForLevel(level + 1) - base;
  return { level, title: TITLES[Math.min(level, TITLES.length) - 1], xp: total, into: total - base, span, toNext: span - (total - base) };
}

const dayNum = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000);

/**
 * Current and best streak of consecutive active days. `days` are ISO dates (any order);
 * the current streak stays alive if the last active day is today or yesterday.
 */
export function computeStreaks(days, today) {
  const nums = [...new Set(days.map(dayNum))].sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const n of nums) {
    run = prev !== null && n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  const t = dayNum(today);
  const current = prev !== null && prev >= t - 1 ? run : 0;
  return { streak: current, bestStreak: best };
}
