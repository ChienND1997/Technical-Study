import test from 'node:test';
import assert from 'node:assert/strict';
import { formatInterval, isStrong, preview, schedule } from './srs.js';
import { createReviewService } from './review.service.js';

const fresh = { state: 'new', interval_minutes: 0, ease: 2.5, reps: 0, lapses: 0 };
const now = new Date('2026-11-05T00:00:00Z');

test('new card: again/hard stay in learning, good/easy graduate', () => {
  assert.deepEqual([1, 2, 3, 4].map((r) => schedule(fresh, r, now).state), ['learning', 'learning', 'review', 'review']);
  assert.equal(schedule(fresh, 1, now).requeueAfter, 3);
  assert.equal(schedule(fresh, 3, now).requeueAfter, null);
  assert.equal(schedule(fresh, 3, now).due_at.toISOString(), '2026-11-06T00:00:00.000Z');
  assert.equal(schedule(fresh, 4, now).interval_minutes, 5760);
});

test('review card: intervals grow, lapse resets to learning and lowers ease', () => {
  const card = { state: 'review', interval_minutes: 1440, ease: 2.5, reps: 3, lapses: 0 };
  assert.equal(schedule(card, 3, now).interval_minutes, 3600);
  assert.ok(schedule(card, 4, now).interval_minutes > schedule(card, 3, now).interval_minutes);
  assert.ok(schedule(card, 2, now).interval_minutes < schedule(card, 3, now).interval_minutes);
  const lapse = schedule(card, 1, now);
  assert.deepEqual([lapse.state, lapse.lapses, lapse.ease, lapse.reps], ['learning', 1, 2.3, 4]);
  const low = schedule({ ...card, ease: 1.3 }, 1, now);
  assert.equal(low.ease, 1.3);
});

test('formatting, preview and strong', () => {
  assert.equal(formatInterval(10), '10 phút');
  assert.equal(formatInterval(180), '3 giờ');
  assert.equal(formatInterval(5760), '4 ngày');
  assert.equal(formatInterval(60 * 1440), '2 tháng');
  assert.deepEqual(preview(fresh), { 1: '10 phút', 2: '6 giờ', 3: '1 ngày', 4: '4 ngày' });
  assert.equal(isStrong({ state: 'review', interval_minutes: 10080 }), true);
});

function make(existing) {
  const log = [];
  const bumps = [];
  const repo = {
    getState: async () => existing,
    saveState: async (u, id, s) => log.push(['save', s.state]),
    insertLog: async (u, l) => log.push(['log', l.rating, l.prevInterval, l.newInterval]),
    addCards: async () => 4,
  };
  const svc = createReviewService({ db: { tx: (fn) => fn({}) }, reviewRepo: repo, activity: { bump: async (u, v) => bumps.push(v) } });
  return { svc, log, bumps };
}

test('answer saves state, logs, credits capped effort', async () => {
  const { svc, log, bumps } = make({ ...fresh });
  const r = await svc.answer(1, { cardId: 5, rating: 1, direction: 'aq', durationMs: 900000 });
  assert.equal(r.requeueAfter, 3);
  assert.deepEqual(log, [['save', 'learning'], ['log', 1, 0, 10]]);
  assert.deepEqual(bumps, [{ seconds: 120, xp: 2, cardsReviewed: 1 }]);
});

test('answer for a card outside the basket fails; empty add fails', async () => {
  const { svc } = make(null);
  await assert.rejects(() => svc.answer(1, { cardId: 5, rating: 3 }), /giỏ/);
  await assert.rejects(() => svc.addToBasket(1, {}), /Chưa chọn/);
  assert.deepEqual(await svc.addToBasket(1, { lessonId: 2 }), { added: 4 });
});
