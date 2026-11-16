import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanService, packToday } from './plan.service.js';

const rows = [
  { lesson_id: 1, ord: 2, minutes: 10 }, { lesson_id: 1, ord: 3, minutes: 10 }, { lesson_id: 1, ord: 5, minutes: 10 },
  { lesson_id: 2, ord: 0, minutes: 10 }, { lesson_id: 2, ord: 1, minutes: 10 },
  { lesson_id: 3, ord: 0, minutes: 10 },
];

test('packToday keeps consecutive sessions and respects the budget', () => {
  const r = packToday(rows, 30);
  assert.deepEqual(r.items, [{ lessonId: 1, secFrom: 2, secTo: 3 }, { lessonId: 2, secFrom: 0, secTo: 0 }]);
  assert.equal(r.minutes, 30);
});

test('packToday always keeps at least one session', () => {
  assert.equal(packToday([{ lesson_id: 1, ord: 0, minutes: 90 }], 30).items.length, 1);
  assert.deepEqual(packToday([], 30), { items: [], minutes: 0 });
});

test('generate applies goal topic/difficulty and saves the plan', async () => {
  let asked, saved;
  const planRepo = {
    getGoal: async () => ({ dailyMinutes: 20, topic: 'redis', difficulty: 'hard' }),
    pickUndone: async (u, a) => ((asked = a), rows),
    savePlan: async (u, p) => (saved = p),
  };
  const out = await createPlanService({ planRepo, random: () => 0.5 }).generate(7);
  assert.equal(asked.topic, 'redis');
  assert.deepEqual(asked.levels, [3]);
  assert.equal(saved.minutes, 20);
  assert.equal(out.sessions, 2);
});

test('generate works without a goal', async () => {
  const planRepo = { getGoal: async () => null, pickUndone: async (u, a) => (assert.equal(a.levels, null), []), savePlan: async () => {} };
  assert.equal((await createPlanService({ planRepo }).generate(1)).sessions, 0);
});
