import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatsService, groupByLesson } from './stats.service.js';

const repo = {
  today: async () => '2026-11-05',
  heat: async () => [{ day: '2026-11-05', seconds: 600, cards_reviewed: 3, sections_done: 1, xp: 9 }],
  activeDays: async () => ['2026-11-04', '2026-11-05'],
  totals: async () => ({ xp: 9 }),
  topics: async () => [],
  dayActivity: async () => ({ seconds: 650, cards_reviewed: 3, sections_done: 2, xp: 9 }),
  daySections: async () => [
    { id: 1, ord: 0, heading: 'A', minutes: 3, lesson_id: 7, lesson_title: 'L', level: 1, lesson_minutes: 10, topic_title: 'T' },
    { id: 2, ord: 1, heading: 'B', minutes: 4, lesson_id: 7, lesson_title: 'L', level: 1, lesson_minutes: 10, topic_title: 'T' },
  ],
};

test('overview has today, streaks, heat and totals', async () => {
  const o = await createStatsService({ statsRepo: repo }).overview(1);
  assert.equal(o.today, '2026-11-05');
  assert.equal(o.streak, 2);
  assert.equal(o.heat.length, 1);
  assert.equal(o.totals.xp, 9);
});

test('day detail groups sections per lesson and validates the date', async () => {
  const svc = createStatsService({ statsRepo: repo });
  const d = await svc.day(1, '2026-11-05');
  assert.equal(d.minutes, 11);
  assert.equal(d.sections, 2);
  assert.equal(d.lessons[0].minutes, 7);
  assert.deepEqual(Object.keys(d), ['day', 'minutes', 'sections', 'cards', 'xp', 'lessons']);
  assert.equal(d.lessons.length, 1);
  assert.equal(d.lessons[0].sections[1].heading, 'B');
  await assert.rejects(() => svc.day(1, '05-11-2026'), /không hợp lệ/);
  assert.deepEqual(groupByLesson([]), []);
});
