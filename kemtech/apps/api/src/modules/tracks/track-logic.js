/** Pure helpers shared by tracks, today and dashboard (no I/O). */

/** A day is finished when it has sessions and all of them are done. */
export const isFull = (d) => d.total > 0 && d.done >= d.total;

/** The day to study now: first unfinished day with content, else the last day when everything is done. */
export function currentDay(days) {
  return days.find((d) => d.total > 0 && d.done < d.total) ?? null;
}

/** Groups consecutive days that start on the same topic into phases. */
export function buildPhases(days) {
  const cur = currentDay(days)?.day_no;
  const phases = [];
  for (const d of days) {
    const key = d.topic_title ?? '';
    let ph = phases.at(-1);
    if (!ph || ph.key !== key) {
      ph = { key, no: phases.length + 1, title: d.topic_title ?? 'Ôn tập', day_from: d.day_no, day_to: d.day_no, days: 0, days_done: 0 };
      phases.push(ph);
    }
    ph.day_to = d.day_no;
    ph.days += 1;
    if (isFull(d)) ph.days_done += 1;
  }
  return phases.map(({ key, ...p }) => ({
    ...p,
    status: p.days_done >= p.days ? 'done' : cur !== undefined && cur >= p.day_from && cur <= p.day_to ? 'current' : 'todo',
  }));
}

/** Track header with progress, current phase and the day to study. */
export function summarize(track, days) {
  const phases = buildPhases(days);
  const daysDone = days.filter(isFull).length;
  const finished = days.length > 0 && daysDone >= days.filter((d) => d.total > 0).length;
  const current = currentDay(days) ?? (finished ? days.at(-1) : null);
  const phase = phases.find((p) => current && current.day_no >= p.day_from && current.day_no <= p.day_to) ?? null;
  return {
    track: { ...track, days: days.length, days_done: daysDone, finished, phase, phases: phases.length },
    phases,
    current,
  };
}

/** Joins a day with its lesson items and their sessions into the shape the pages render. */
export function assembleDay(day, items, sections) {
  const out = items.map((it) => {
    const secs = sections.filter((s) => s.item_ord === it.item_ord).map(({ item_ord, ...s }) => s);
    return {
      item_ord: it.item_ord, lesson_id: it.lesson_id, lesson_title: it.lesson_title,
      topic_title: it.topic_title, level: it.level, minutes: secs.reduce((a, s) => a + s.minutes, 0), sections: secs,
    };
  });
  const all = out.flatMap((i) => i.sections);
  return {
    id: day.id, day_no: day.day_no, title: day.title,
    total: all.length, done: all.filter((s) => s.done).length,
    minutes: all.reduce((a, s) => a + s.minutes, 0), doneMinutes: all.filter((s) => s.done).reduce((a, s) => a + s.minutes, 0),
    items: out,
  };
}
