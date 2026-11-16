import test from 'node:test';
import assert from 'node:assert/strict';
import { createDashboardService, groupRecent } from './dashboard.service.js';

test('groupRecent groups lessons per day', () => {
  const r = groupRecent(
    [
      { day: '2025-01-15', lesson_id: 1, title: 'A', topic: 'T', sections: 2, minutes: 8 },
      { day: '2025-01-15', lesson_id: 2, title: 'B', topic: 'T', sections: 1, minutes: 4 },
      { day: '2025-01-14', lesson_id: 1, title: 'A', topic: 'T', sections: 1, minutes: 3 },
    ],
    [{ day: '2025-01-15', seconds: 1200 }],
  );
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].sections, r[0].minutes, r[0].studyMinutes, r[0].lessons.length], [3, 12, 20, 2]);
});

test('dashboard adds plan, week, recent and topics to the snapshot', async () => {
  const dashboardRepo = {
    today: async () => '2025-01-15', activity: async () => [{ day: '2025-01-15', seconds: 900, sections_done: 1, cards_reviewed: 0, xp: 5 }],
    totalXp: async () => 5, cardCounts: async () => ({ review_due: 1, new_due: 0, basket: 1 }), goal: async () => null, activeTrack: async () => null,
    dailyPlan: async () => ({ total: 0, items: [] }),
    recentSessions: async () => [{ day: '2025-01-15', lesson_id: 1, title: 'A', topic: 'T', sections: 1, minutes: 5 }],
    topicProgress: async () => [{ slug: 't', title: 'T', done: 1, total: 4 }],
  };
  const r = await createDashboardService({ dashboardRepo }).get(1);
  assert.equal(r.week.length, 7);
  assert.equal(r.week.at(-1).minutes, 15);
  assert.equal(r.weekCal.length, 7);
  assert.equal(r.recent[0].lessons[0].lessonId, 1);
  assert.equal(r.topics[0].slug, 't');
  assert.equal(r.plan.total, 0);
  assert.equal(r.track, null);
  assert.equal(r.streak, 1);
});
