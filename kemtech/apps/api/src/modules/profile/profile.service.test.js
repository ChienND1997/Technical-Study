import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileService, levelOf, streakOf } from './profile.service.js';
import { hashPassword, verifyPassword } from '../auth/password.js';

async function make(hash = null) {
  const user = { id: 1, name: 'An', email: 'an@x.com', role: 'user', created_at: '2026-01-01', password_hash: hash };
  const state = { settings: {}, xp: 250, days: [], badges: ['first_section'] };
  const authRepo = {
    findById: async (id) => (id === 1 ? user : null),
    setName: async (_, n) => { user.name = n; },
    setPasswordHash: async (_, h) => { user.password_hash = h; },
  };
  const profileRepo = {
    getSettings: async () => state.settings,
    saveGoal: async (_, g) => { state.settings = { goal: g }; },
    totalXp: async () => state.xp,
    activeDays: async () => state.days,
    badges: async () => state.badges,
  };
  return { svc: createProfileService({ profileRepo, authRepo }), user, state };
}
const status = (fn, code) => assert.rejects(fn, (e) => e.statusCode === code);

test('level and streak maths', () => {
  assert.deepEqual(levelOf(0), { level: 1, title: 'Tân binh', xp: 0, into: 0, span: 50 });
  assert.equal(levelOf(250).level, 3);
  assert.equal(levelOf(450).level, 4);
  const today = new Date(2026, 5, 10);
  assert.equal(streakOf(['2026-06-10', '2026-06-09', '2026-06-08', '2026-06-05'], today), 3);
  assert.equal(streakOf(['2026-06-09'], today), 1); // yesterday still counts
  assert.equal(streakOf(['2026-06-01'], today), 0);
});

test('get returns user, default goal and game summary', async () => {
  const { svc } = await make();
  const p = await svc.get(1);
  assert.deepEqual(p.goal, { dailyMinutes: 30, topic: null, difficulty: 'mixed' });
  assert.equal(p.user.isAdmin, false);
  assert.equal(p.game.level, 3);
  assert.deepEqual(p.game.badges.map((b) => b.title), ['Bước đầu tiên']);
  await status(() => svc.get(9), 404);
});

test('saveName trims and rejects blanks', async () => {
  const { svc, user } = await make();
  assert.equal((await svc.saveName(1, '  Bình ')).name, 'Bình');
  assert.equal(user.name, 'Bình');
  await status(() => svc.saveName(1, '   '), 400);
});

test('saveGoal stores a cleaned goal that get returns', async () => {
  const { svc } = await make();
  await status(() => svc.saveGoal(1, { dailyMinutes: 2 }), 400);
  assert.deepEqual(await svc.saveGoal(1, { dailyMinutes: 999, topic: 'redis', difficulty: 'weird' }), { dailyMinutes: 480, topic: 'redis', difficulty: 'mixed' });
  assert.equal((await svc.get(1)).goal.topic, 'redis');
});

test('changePassword: requires the current one only when a password exists', async () => {
  const { svc, user } = await make(await hashPassword('old-pass'));
  await status(() => svc.changePassword(1, { current: 'wrong', next: 'new-pass' }), 401);
  await status(() => svc.changePassword(1, { current: 'old-pass', next: '123' }), 400);
  await svc.changePassword(1, { current: 'old-pass', next: 'new-pass' });
  assert.ok(await verifyPassword('new-pass', user.password_hash));

  const g = await make(null); // Google-only account sets a first password
  await g.svc.changePassword(1, { next: 'first-pass' });
  assert.ok(await verifyPassword('first-pass', g.user.password_hash));
});
