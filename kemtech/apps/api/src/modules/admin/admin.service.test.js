import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminService } from './admin.service.js';
import { verifyPassword } from '../auth/password.js';

function make() {
  const rows = [
    { id: 1, name: 'Boss', role: 'admin', active: true, deleted_at: null },
    { id: 2, name: 'Mod', role: 'admin', active: true, deleted_at: null },
    { id: 3, name: 'User', role: 'user', active: true, deleted_at: null },
  ];
  const get = (id) => rows.find((r) => r.id === id) ?? null;
  const authRepo = {
    listAll: async () => rows,
    findById: async (id) => get(id),
    findByEmail: async (e) => rows.find((r) => r.email === e) ?? null,
    create: async (d) => { const r = { id: rows.length + 1, active: true, deleted_at: null, name: d.name, email: d.email, role: d.role, password_hash: d.passwordHash }; rows.push(r); return r; },
    activeAdminIds: async () => rows.filter((r) => r.role === 'admin' && r.active && !r.deleted_at).map((r) => r.id),
    setRole: async (id, role) => { get(id).role = role; },
    setActive: async (id, a) => { get(id).active = a; },
    softDelete: async (id) => { get(id).deleted_at = new Date(); },
    restore: async (id) => { get(id).deleted_at = null; },
    setPasswordHash: async (id, h) => { get(id).password_hash = h; },
  };
  let ingested = 0;
  return { svc: createAdminService({ authRepo, authService: {}, ingest: { run: async () => { ingested++; return { files: 2 }; } } }), rows, ingested: () => ingested };
}
const status = (fn, code) => assert.rejects(fn, (e) => e.statusCode === code);

test('createUser validates, hashes the password and rejects duplicate emails', async () => {
  const { svc, rows } = make();
  await status(() => svc.createUser({ name: 'A', email: 'bad', password: 'secret1' }), 400);
  await status(() => svc.createUser({ name: 'A', email: 'a@x.com', password: '123' }), 400);
  const u = await svc.createUser({ name: ' Lan ', email: 'lan@x.com', password: 'secret1' });
  assert.equal(u.name, 'Lan');
  assert.ok(await verifyPassword('secret1', rows.at(-1).password_hash));
  await status(() => svc.createUser({ name: 'B', email: 'lan@x.com', password: 'secret1' }), 400);
});

test('an admin cannot demote, deactivate or delete themself', async () => {
  const { svc } = make();
  await status(() => svc.setRole(1, 1, 'user'), 403);
  await status(() => svc.setActive(1, 1, false), 403);
  await status(() => svc.softDelete(1, 1), 403);
});

test('the last active admin is protected, other admins are not', async () => {
  const { svc, rows } = make();
  await svc.setRole(1, 2, 'user'); // Boss demotes Mod
  await status(() => svc.setRole(3, 1, 'user'), 403); // only Boss is left
  await status(() => svc.softDelete(3, 1), 403);
  await svc.setRole(1, 3, 'admin');
  await svc.softDelete(1, 3);
  assert.ok(rows[2].deleted_at);
  await svc.restore(3);
  assert.equal(rows[2].deleted_at, null);
});

test('plain users can be deactivated and reactivated; unknown id is 404', async () => {
  const { svc, rows } = make();
  await svc.setActive(1, 3, false);
  assert.equal(rows[2].active, false);
  await svc.setActive(1, 3, true);
  await status(() => svc.setActive(1, 99, true), 404);
});

test('resetPassword enforces length and refuses deleted accounts', async () => {
  const { svc, rows } = make();
  await status(() => svc.resetPassword(3, '123'), 400);
  await svc.resetPassword(3, 'newpass1');
  assert.ok(await verifyPassword('newpass1', rows[2].password_hash));
  rows[2].deleted_at = new Date();
  await status(() => svc.resetPassword(3, 'newpass1'), 400);
});

test('runIngest delegates to ingest.run', async () => {
  const { svc, ingested } = make();
  assert.deepEqual(await svc.runIngest(), { files: 2 });
  assert.equal(ingested(), 1);
});
