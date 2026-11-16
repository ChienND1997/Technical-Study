const DAY = 1440;
const MIN_EASE = 1.3;

/** Human text for an interval in minutes: "10 phút", "3 giờ", "5 ngày", "2 tháng". */
export function formatInterval(min) {
  if (min < 60) return `${Math.max(1, Math.round(min))} phút`;
  if (min < DAY) return `${Math.round(min / 60)} giờ`;
  if (min < 30 * DAY) return `${Math.round(min / DAY)} ngày`;
  return `${Math.round(min / (30 * DAY))} tháng`;
}

/**
 * Pure scheduler (SM-2 flavoured). card: { state, interval_minutes, ease, reps, lapses }; rating 1..4
 * (again, hard, good, easy). Returns the next card state plus `due_at` and `requeueAfter`
 * (how many cards later the UI should show an "again" card in the same session, else null).
 */
export function schedule(card, rating, now = new Date()) {
  const interval = card.interval_minutes ?? 0;
  const ease = card.ease ?? 2.5;
  let next;

  if (card.state === 'review') {
    if (rating === 1) next = { state: 'learning', interval: 10, ease: Math.max(MIN_EASE, ease - 0.2), lapses: card.lapses + 1 };
    else if (rating === 2) next = { state: 'review', interval: Math.max(DAY, interval * 1.2), ease: Math.max(MIN_EASE, ease - 0.15) };
    else if (rating === 3) next = { state: 'review', interval: Math.max(DAY, interval * ease), ease };
    else next = { state: 'review', interval: Math.max(DAY, interval * ease * 1.3), ease: ease + 0.15 };
  } else {
    // new or learning: short steps, then graduate to the review queue
    if (rating === 1) next = { state: 'learning', interval: 10, ease };
    else if (rating === 2) next = { state: 'learning', interval: 360, ease };
    else if (rating === 3) next = { state: 'review', interval: DAY, ease };
    else next = { state: 'review', interval: 4 * DAY, ease: ease + 0.15 };
  }

  const minutes = Math.round(next.interval);
  return {
    state: next.state,
    interval_minutes: minutes,
    ease: Math.round(next.ease * 100) / 100,
    reps: card.reps + 1,
    lapses: next.lapses ?? card.lapses,
    due_at: new Date(now.getTime() + minutes * 60000),
    requeueAfter: rating === 1 ? 3 : null,
  };
}

/** Button labels for the four ratings, e.g. { 1: '10 phút', 2: '6 giờ', 3: '1 ngày', 4: '4 ngày' }. */
export function preview(card) {
  const out = {};
  for (const r of [1, 2, 3, 4]) out[r] = formatInterval(schedule(card, r).interval_minutes);
  return out;
}

/** A card counts as "strong" once its interval reaches a week. */
export const isStrong = (card) => card.state === 'review' && card.interval_minutes >= 7 * DAY;
