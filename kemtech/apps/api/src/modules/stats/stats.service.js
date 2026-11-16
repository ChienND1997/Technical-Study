import { BadRequestError } from '../../common/errors.js';
import { computeStreaks } from '../game/levels.js';

const HEAT_DAYS = 90;

/** Groups completed sections by lesson (lesson minutes = sum of the listed sections), in the shape of the Today page's lesson blocks. */
export function groupByLesson(rows) {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.lesson_id)) {
      out.set(r.lesson_id, { lesson_id: r.lesson_id, lesson_title: r.lesson_title, level: r.level, topic_title: r.topic_title, minutes: 0, sections: [] });
    }
    const l = out.get(r.lesson_id);
    l.minutes += r.minutes;
    l.sections.push({ id: r.id, ord: r.ord, heading: r.heading, minutes: r.minutes, done: true });
  }
  return [...out.values()];
}

export function createStatsService({ statsRepo }) {
  return {
    /** Payload of GET /stats: streaks, totals, 90-day heat rows and per-topic progress. */
    async overview(userId) {
      const [today, heat, days, totals, topics] = await Promise.all([
        statsRepo.today(), statsRepo.heat(userId, HEAT_DAYS), statsRepo.activeDays(userId), statsRepo.totals(userId), statsRepo.topics(userId),
      ]);
      const { streak, bestStreak } = computeStreaks(days, today);
      return { today, heat, streak, bestStreak, totals, topics };
    },

    /** Payload of GET /stats/day/:day (YYYY-MM-DD). */
    async day(userId, day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) throw new BadRequestError('Ngày không hợp lệ');
      const [act, sections] = await Promise.all([statsRepo.dayActivity(userId, day), statsRepo.daySections(userId, day)]);
      return {
        day,
        minutes: Math.round(act.seconds / 60),
        sections: act.sections_done,
        cards: act.cards_reviewed,
        xp: act.xp,
        lessons: groupByLesson(sections),
      };
    },
  };
}
