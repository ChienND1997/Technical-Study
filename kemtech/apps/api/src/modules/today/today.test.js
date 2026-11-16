import test from 'node:test';
import assert from 'node:assert/strict';
import { createTodayService } from './today.service.js';
import { addDays, streaks, weekCal, lastWeek } from './today.logic.js';

test('streak stays alive until today ends and best streak is tracked', () => {
  const days = ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-10', '2025-01-11'];
  assert.deepEqual(streaks(days, '2025-01-12'), { streak: 2, bestStreak: 3 });
  assert.deepEqual(streaks(days, '2025-01-11'), { streak: 2, bestStreak: 3 });
  assert.deepEqual(streaks(days, '2025-01-14'), { streak: 0, bestStreak: 3 });
  assert.equal(addDays('2025-03-01', -1), '2025-02-28');
});

test('weekCal starts on Monday and flags future days', () => {
  const w = weekCal([{ day: '2025-01-13', seconds: 600, sections_done: 0, cards_reviewed: 0 }], '2025-01-15'); // Wednesday
  assert.equal(w[0].day, '2025-01-13');
  assert.equal(w[0].minutes, 10);
  assert.equal(w[0].active, true);
  assert.equal(w[2].today, true);
  assert.equal(w[3].future, true);
  assert.equal(lastWeek([], '2025-01-15').at(-1).day, '2025-01-15');
});

test('today snapshot combines streak, cards and the active track day', async () => {
  const todayRepo = {
    today: async () => '2025-01-15',
    activity: async () => [{ day: '2025-01-14', seconds: 60, sections_done: 1, cards_reviewed: 0, xp: 5 }, { day: '2025-01-15', seconds: 1800, sections_done: 2, cards_reviewed: 0, xp: 10 }],
    totalXp: async () => 15,
    cardCounts: async () => ({ review_due: 3, new_due: 2, basket: 9 }),
    goal: async () => ({ dailyMinutes: 30, topic: null, difficulty: 'mixed' }),
    activeTrack: async () => ({ id: 4, title: 'T' }),
    trackDays: async () => [{ day_no: 1, total: 2, done: 2, topic_title: 'A', level: 1 }, { day_no: 2, total: 2, done: 0, topic_title: 'A', level: 1 }],
    dayDetail: async (t, n) => ({ day_no: n, items: [] }),
  };
  const r = await createTodayService({ todayRepo }).get(1);
  assert.equal(r.streak, 2);
  assert.equal(r.doneToday, true);
  assert.equal(r.minutesToday, 30);
  assert.equal(r.totalXp, 15);
  assert.equal(r.reviewDue, 3);
  assert.equal(r.track.days_done, 1);
  assert.equal(r.day.day_no, 2);
});

test('today works without an active track', async () => {
  const todayRepo = {
    today: async () => '2025-01-15', activity: async () => [], totalXp: async () => 0,
    cardCounts: async () => ({ review_due: 0, new_due: 0, basket: 0 }), goal: async () => null, activeTrack: async () => null,
  };
  const r = await createTodayService({ todayRepo }).get(1);
  assert.equal(r.track, null);
  assert.equal(r.streak, 0);
  assert.equal(r.doneToday, false);
});
