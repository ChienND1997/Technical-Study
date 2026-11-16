const LEVELS = { easy: [1], medium: [2], hard: [3] };

/** Reads the goal with defaults: { dailyMinutes, topic, difficulty }. */
export function normalizeGoal(g) {
  if (!g || typeof g !== 'object') return null;
  const m = Number(g.dailyMinutes);
  return { dailyMinutes: m >= 5 ? Math.min(m, 480) : 30, topic: g.topic || null, difficulty: LEVELS[g.difficulty] ? g.difficulty : 'mixed' };
}

/**
 * Packs random unfinished sessions into the daily minutes budget.
 * Per lesson only the consecutive run starting at its first unfinished session is used, so sessions stay in order.
 */
export function packToday(rows, budget) {
  const items = [];
  let minutes = 0;
  const lessons = new Map();
  for (const r of rows) (lessons.get(r.lesson_id) ?? lessons.set(r.lesson_id, []).get(r.lesson_id)).push(r);
  outer: for (const [lessonId, secs] of lessons) {
    let item = null;
    for (const s of secs) {
      if (item && s.ord !== item.secTo + 1) break;
      if (items.length > 0 && minutes + s.minutes > budget) break outer;
      if (!item) items.push((item = { lessonId, secFrom: s.ord, secTo: s.ord }));
      else item.secTo = s.ord;
      minutes += s.minutes;
    }
    if (minutes >= budget) break;
  }
  return { items, minutes };
}

/** Builds today's study list from the user's goal. */
export function createPlanService({ planRepo, random = Math.random }) {
  return {
    async generate(userId) {
      const goal = normalizeGoal(await planRepo.getGoal(userId)) ?? { dailyMinutes: 30, topic: null, difficulty: 'mixed' };
      const rows = await planRepo.pickUndone(userId, {
        topic: goal.topic, levels: LEVELS[goal.difficulty] ?? null, seed: String(random()),
      });
      const { items, minutes } = packToday(rows, goal.dailyMinutes);
      await planRepo.savePlan(userId, { items, minutes });
      return { ok: true, sessions: items.reduce((a, i) => a + i.secTo - i.secFrom + 1, 0), lessons: items.length, minutes };
    },
  };
}
