/** Effort levels by minutes studied in a day. */
export const TIERS = [
  { key: 'need', label: 'Cần thiết', minutes: 30, icon: '🌱', color: '#22c55e', desc: '30 phút' },
  { key: 'try', label: 'Cố gắng', minutes: 60, icon: '💪', color: '#3b82f6', desc: '1 tiếng' },
  { key: 'hard', label: 'Chăm chỉ', minutes: 90, icon: '🔥', color: '#f97316', desc: '1 tiếng rưỡi' },
  { key: 'excellent', label: 'Xuất sắc', minutes: 120, icon: '🏆', color: '#eab308', desc: '2 tiếng trở lên' },
];

/** Highest tier reached with `minutes`, or null when below the first one. */
export function tierOf(minutes) {
  let hit = null;
  for (const t of TIERS) if (minutes >= t.minutes) hit = t;
  return hit;
}

/** The tier a goal of `minutes` per day corresponds to (the closest one not above it, else the first). */
export const tierForGoal = (minutes) => tierOf(minutes) ?? TIERS[0];

/** Next tier above `minutes`, or null when already at the top. */
export const nextTier = (minutes) => TIERS.find((t) => t.minutes > minutes) ?? null;
