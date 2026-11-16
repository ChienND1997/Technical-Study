/**
 * Packs section units into days based on a minutes budget per day.
 * - Never splits a section unit.
 * - Merges adjacent sections of the same lesson into a single item: { lessonId, secFrom, secTo }.
 * - Oversized section becomes its own day.
 * - Title shows first lesson title, plus `(+N bài)` if multiple unique lessons are included.
 */
export function packDays(units, budget = 45) {
  if (!units || !units.length) return [];

  const days = [];
  let currentUnits = [];
  let currentMinutes = 0;

  function flushDay() {
    if (!currentUnits.length) return;

    const items = [];
    const seenLessons = [];

    for (const u of currentUnits) {
      if (!seenLessons.includes(u.lessonTitle)) {
        seenLessons.push(u.lessonTitle);
      }
      const last = items[items.length - 1];
      if (last && last.lessonId === u.lessonId && last.secTo + 1 === u.ord) {
        last.secTo = u.ord;
      } else {
        items.push({
          lessonId: u.lessonId,
          secFrom: u.ord,
          secTo: u.ord,
        });
      }
    }

    const firstTitle = seenLessons[0] || '';
    const extra = seenLessons.length - 1;
    const title = extra > 0 ? `${firstTitle} (+${extra} bài)` : firstTitle;

    days.push({
      items,
      minutes: currentMinutes,
      title,
    });

    currentUnits = [];
    currentMinutes = 0;
  }

  for (const u of units) {
    if (currentUnits.length > 0 && currentMinutes + u.minutes > budget) {
      flushDay();
    }
    currentUnits.push(u);
    currentMinutes += u.minutes;
  }
  flushDay();

  return days;
}

