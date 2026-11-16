import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressService } from './progress.service.js';

function make() {
  const done = new Set();
  const rewarded = new Set();
  const bumps = [];
  const secs = [{ id: 1, ord: 0 }, { id: 2, ord: 1 }, { id: 3, ord: 2 }];
  const repo = {
    findSection: async (id) => secs.find((s) => s.id === id) && { ...secs.find((s) => s.id === id), lesson_id: 9, minutes: 4 },
    lessonSections: async () => secs.map((s) => ({ ...s, done: done.has(s.id) })),
    markDone: async (u, id) => !done.has(id) && !!done.add(id),
    unmark: async (u, id) => done.delete(id),
    claimReward: async (u, id) => !rewarded.has(id) && !!rewarded.add(id),
  };
  const db = { tx: (fn) => fn({}) };
  const activity = { bump: async (u, v) => bumps.push(v) };
  const gameService = { evaluate: async () => [{ id: 'first_section' }] };
  return { svc: createProgressService({ db, progressRepo: repo, activity, gameService }), bumps };
}

test('completes in order and rewards XP once', async () => {
  const { svc, bumps } = make();
  await assert.rejects(() => svc.complete({ userId: 1, sectionId: 2, done: true }), /trước/);
  const r = await svc.complete({ userId: 1, sectionId: 1, done: true });
  assert.equal(r.xp, 10);
  assert.equal(r.newBadges.length, 1);
  assert.deepEqual(bumps[0], { xp: 10, seconds: 240, sectionsDone: 1 });
  await svc.complete({ userId: 1, sectionId: 1, done: false });
  assert.deepEqual(bumps[1], { sectionsDone: -1 });
  const again = await svc.complete({ userId: 1, sectionId: 1, done: true });
  assert.equal(again.xp, 0); // already rewarded
});

test('cannot untick a section while a later one is done; lessonDone reported', async () => {
  const { svc } = make();
  for (const id of [1, 2]) await svc.complete({ userId: 1, sectionId: id, done: true });
  await assert.rejects(() => svc.complete({ userId: 1, sectionId: 1, done: false }), /sau/);
  assert.equal((await svc.complete({ userId: 1, sectionId: 3, done: true })).lessonDone, true);
  await assert.rejects(() => svc.complete({ userId: 1, sectionId: 99, done: true }), /Không có/);
});
