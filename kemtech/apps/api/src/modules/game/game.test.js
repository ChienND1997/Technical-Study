import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStreaks, levelInfo, xpForLevel } from './levels.js';
import { badgesToAward } from './badges.js';
import { createGameService } from './game.service.js';

test('levelInfo: thresholds and progress', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(49).level, 1);
  const l2 = levelInfo(50);
  assert.deepEqual([l2.level, l2.into, l2.span, l2.toNext], [2, 0, 150, 150]);
  assert.equal(levelInfo(xpForLevel(5)).level, 5);
  assert.equal(levelInfo(100000).title, 'Huyền thoại');
});

test('computeStreaks: current alive until yesterday, best over history', () => {
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-10-20', '2026-10-21'];
  assert.deepEqual(computeStreaks(days, '2026-11-04'), { streak: 3, bestStreak: 3 });
  assert.deepEqual(computeStreaks(days, '2026-11-06'), { streak: 0, bestStreak: 3 });
  assert.deepEqual(computeStreaks([], '2026-11-06'), { streak: 0, bestStreak: 0 });
});

test('badgesToAward skips already earned', () => {
  const c = { sections: 1, reviews: 0, basket: 0, mature: 0, quizCorrect: 0, mocks: 0, bestStreak: 0, xp: 0, level: 1 };
  assert.deepEqual(badgesToAward(c, []), ['first_section']);
  assert.deepEqual(badgesToAward(c, ['first_section']), []);
});

function fakeRepo() {
  const store = [];
  return {
    counters: async () => ({ xp: 60, sections: 1, reviews: 0, basket: 0, mature: 0, quizCorrect: 0, mocks: 0, today: '2026-11-05' }),
    activeDays: async () => ['2026-11-05'],
    earned: async () => store.map((badge) => ({ badge, earned_at: new Date() })),
    award: async (u, ids) => store.push(...ids),
  };
}

test('game service: awards once, reports new badges once', async () => {
  const repo = fakeRepo();
  const svc = createGameService({ gameRepo: repo });
  const g1 = await svc.get(1);
  assert.equal(g1.level, 2);
  assert.deepEqual(g1.newBadges.map((b) => b.id), ['first_section']);
  assert.equal(g1.badges.find((b) => b.id === 'first_section').earned, true);
  const g2 = await svc.get(1);
  assert.deepEqual(g2.newBadges, []);
});

test('evaluate result is queued for the next GET /game', async () => {
  const repo = fakeRepo();
  const svc = createGameService({ gameRepo: repo });
  assert.equal((await svc.evaluate(1)).length, 1);
  assert.equal((await svc.get(1)).newBadges.length, 1);
});
