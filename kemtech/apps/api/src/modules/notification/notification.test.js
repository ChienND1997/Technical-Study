import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationService } from './notification.service.js';

function make() {
  const rows = [];
  const pushes = [];
  let read = null;
  const repo = {
    insert: async (n) => { const r = { id: rows.length + 1, user_id: n.userId, actor_id: n.actorId, type: n.type, text: n.text, link: n.link, ref_id: n.refId, count: 1, read_at: null }; rows.push(r); return r; },
    findGroup: async (u, t, ref) => rows.find((r) => r.user_id === u && r.type === t && r.ref_id === ref) ?? null,
    bump: async (id, { count, text, actorId }) => Object.assign(rows.find((r) => r.id === id), { count, text, actor_id: actorId, read_at: null }),
    markRead: async (u, ids) => { read = [u, ids]; return 1; },
    markGroupRead: async (u, g) => rows.filter((r) => r.user_id === u && r.ref_id === g && !r.read_at).map((r) => { r.read_at = 1; }).length,
    unreadCount: async () => 3,
  };
  const hub = { sendTo: (id, e, d) => pushes.push([id, e, d]) };
  return { svc: createNotificationService({ notifRepo: repo, hub }), rows, pushes, read: () => read };
}

test('notify stores and pushes; skips self notifications', async () => {
  const { svc, rows, pushes } = make();
  await svc.notify({ userId: 2, actorId: 1, type: 'group_invite', text: 'hi', refId: 7 });
  await svc.notify({ userId: 1, actorId: 1, type: 'x', text: 'self' });
  assert.equal(rows.length, 1);
  assert.deepEqual(pushes.map((p) => [p[0], p[1], p[2].type]), [[2, 'notification', 'group_invite']]);
});

test('notifyGrouped merges unread notifications and rewrites the text', async () => {
  const { svc, rows, pushes } = make();
  const textFor = (n) => (n === 1 ? 'one' : `${n} new`);
  const args = { userId: 2, actorId: 1, type: 'group_message', refId: 10, link: '/groups/10', textFor };
  await svc.notifyGrouped(args);
  await svc.notifyGrouped(args);
  await svc.notifyGrouped(args);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 3);
  assert.equal(rows[0].text, '3 new');
  assert.equal(pushes.length, 3);
  rows[0].read_at = 1; // already read…
  await svc.notifyGrouped(args);
  assert.equal(rows.length, 1); // …but a new event still replaces it instead of piling up a duplicate
  assert.equal(rows[0].count, 4);
  assert.equal(rows[0].text, '4 new');
  assert.equal(rows[0].read_at, null); // and it surfaces as unread again
});

test('markRead without ids reads all; markGroupRead clears chat notices', async () => {
  const { svc, read, rows } = make();
  await svc.markRead(2, undefined);
  assert.deepEqual(read(), [2, null]);
  await svc.markRead(2, [4, 5]);
  assert.deepEqual(read(), [2, [4, 5]]);
  await svc.notifyGrouped({ userId: 2, actorId: 1, type: 'group_message', refId: 10, textFor: () => 't' });
  await svc.markGroupRead(2, 10);
  assert.ok(rows[0].read_at);
  assert.deepEqual(await svc.unreadCount(2), { count: 3 });
});
