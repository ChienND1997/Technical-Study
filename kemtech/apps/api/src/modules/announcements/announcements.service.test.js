import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnnouncementsService } from './announcements.service.js';

function make() {
  const rows = [];
  const sent = [];
  const announcementsRepo = {
    listActive: async () => rows.filter((r) => r.active),
    listHistory: async () => rows,
    listAll: async () => rows,
    get: async (id) => rows.find((r) => r.id === id) ?? null,
    create: async (d) => { const r = { id: rows.length + 1, kind: d.kind, title: d.title, body: d.body, starts_at: d.startsAt ?? new Date(), ends_at: d.endsAt ?? null, active: d.active, created_by: d.createdBy }; rows.push(r); return r; },
    update: async (id, d) => Object.assign(rows.find((r) => r.id === id), { kind: d.kind, title: d.title, body: d.body, starts_at: d.startsAt, ends_at: d.endsAt, active: d.active }),
    remove: async (id) => { const i = rows.findIndex((r) => r.id === id); return i < 0 ? null : rows.splice(i, 1)[0]; },
  };
  const svc = createAnnouncementsService({ announcementsRepo, notifier: { notify: async (n) => sent.push(n) }, authRepo: { activeUserIds: async () => [1, 2] } });
  return { svc, rows, sent };
}
const status = (fn, code) => assert.rejects(fn, (e) => e.statusCode === code);

test('create validates kind, title and date order, and trims', async () => {
  const { svc } = make();
  await status(() => svc.create(9, { kind: 'nope', title: 'Hello' }), 400);
  await status(() => svc.create(9, { title: 'ab' }), 400);
  await status(() => svc.create(9, { title: 'Hello', startsAt: '2030-02-01T00:00:00Z', endsAt: '2030-01-01T00:00:00Z' }), 400);
  const a = await svc.create(9, { title: '  Bảo trì  ', body: ' nội dung ' });
  assert.deepEqual([a.kind, a.title, a.body, a.active, a.created_by], ['info', 'Bảo trì', 'nội dung', true, 9]);
});

test('notifications go out only when asked', async () => {
  const { svc, sent } = make();
  await svc.create(9, { title: 'Quiet one' });
  assert.equal(sent.length, 0);
  await svc.create(9, { title: 'Loud one', notify: true });
  assert.deepEqual(sent.map((n) => [n.userId, n.type, n.text]), [[1, 'announcement', 'Loud one'], [2, 'announcement', 'Loud one']]);
});

test('update merges a partial patch (hide/show) and keeps other fields', async () => {
  const { svc } = make();
  const a = await svc.create(9, { title: 'Keep me', kind: 'feature' });
  const u = await svc.update(a.id, { active: false });
  assert.deepEqual([u.active, u.title, u.kind], [false, 'Keep me', 'feature']);
  await status(() => svc.update(a.id, { title: 'x' }), 400);
  await status(() => svc.update(99, { active: true }), 404);
});

test('remove deletes or 404s', async () => {
  const { svc, rows } = make();
  const a = await svc.create(9, { title: 'Bye now' });
  assert.deepEqual(await svc.remove(a.id), { ok: true });
  assert.equal(rows.length, 0);
  await status(() => svc.remove(a.id), 404);
});
