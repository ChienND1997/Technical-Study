import { buildToday } from '../today/today.service.js';
import { lastWeek, weekCal } from '../today/today.logic.js';

/** Groups finished sessions by day (newest first, max 7 days) for the "recent days" timeline. */
export function groupRecent(sessions, activity) {
  const by = new Map();
  for (const s of sessions) {
    if (!by.has(s.day)) by.set(s.day, []);
    by.get(s.day).push(s);
  }
  const act = new Map(activity.map((r) => [r.day, r]));
  return [...by].slice(0, 7).map(([day, ls]) => ({
    day,
    sections: ls.reduce((a, l) => a + l.sections, 0),
    minutes: ls.reduce((a, l) => a + l.minutes, 0),
    studyMinutes: Math.round((act.get(day)?.seconds ?? 0) / 60),
    lessons: ls.map((l) => ({ lessonId: l.lesson_id, title: l.title, topic: l.topic, sections: l.sections })),
  }));
}

/** GET /dashboard: everything the home page shows. */
export function createDashboardService({ dashboardRepo }) {
  return {
    async get(userId) {
      const [{ data, rows, today }, plan, sessions] = await Promise.all([
        buildToday(dashboardRepo, userId), dashboardRepo.dailyPlan(userId), dashboardRepo.recentSessions(userId),
      ]);
      const topics = await dashboardRepo.topicProgress(userId, data.track?.id ?? null);
      return {
        ...data,
        plan,
        week: lastWeek(rows, today),
        weekCal: weekCal(rows, today),
        recent: groupRecent(sessions, rows),
        topics,
      };
    },
  };
}
