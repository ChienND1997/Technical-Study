import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from './auth.service.js';
import { hashPassword, verifyPassword } from './password.js';
import { readCookie, sessionCookie, signToken, verifyToken } from './session.js';

const config = { sessionSecret: 'secret', sessionTtlDays: 1, adminUser: 'root', adminPassword: 'pw-admin', googleClientId: 'gid' };

async function make(extra = {}) {
  const rows = [
    { id: 1, name: 'An', email: 'an@x.com', role: 'user', active: true, deleted_at: null, password_hash: await hashPassword('secret1') },
    { id: 2, name: 'Off', email: 'off@x.com', role: 'user', active: false, deleted_at: null, password_hash: await hashPassword('secret1') },
    { id: 3, name: 'Gone', email: 'gone@x.com', role: 'user', active: true, deleted_at: new Date(), password_hash: null },
  ];
  const find = (f) => rows.find(f) ?? null;
  const authRepo = {
    findById: async (id) => find((r) => r.id === id),
    findByLogin: async (i) => find((r) => !r.deleted_at && r.password_hash && [r.email, r.name].some((v) => v.toLowerCase() === i.toLowerCase())),
    findByEmail: async (e) => find((r) => r.email === e),
    findByGoogleSub: async (s) => find((r) => r.google_sub === s),
    findAdminByName: async (n) => find((r) => r.role === 'admin' && r.name === n),
    create: async (d) => { const r = { id: rows.length + 1, active: true, deleted_at: null, avatar_url: d.avatarUrl, name: d.name, email: d.email, role: d.role ?? 'user', google_sub: d.googleSub }; rows.push(r); return r; },
    linkGoogle: async (id, sub) => Object.assign(find((r) => r.id === id), { google_sub: sub }),
    findPublicByIds: async (ids) => rows.filter((r) => ids.includes(r.id) && !r.deleted_at),
    search: async (q, ex) => rows.filter((r) => r.id !== ex && r.name.toLowerCase().includes(q.toLowerCase())),
    ...extra.repo,
  };
  let t = 1_000_000;
  const svc = createAuthService({ authRepo, config, now: () => t, fetchImpl: extra.fetchImpl });
  return { svc, rows, tick: (ms) => (t += ms) };
}
const status = (fn, code) => assert.rejects(fn, (e) => e.statusCode === code);

test('scrypt: verifies the right password, salts differ, malformed hash is false', async () => {
  const a = await hashPassword('abc123');
  assert.notEqual(a, await hashPassword('abc123'));
  assert.ok(await verifyPassword('abc123', a));
  assert.ok(!(await verifyPassword('abc124', a)));
  assert.ok(!(await verifyPassword('x', null)) && !(await verifyPassword('x', 'plain')));
});

test('session token: tamper and expiry are rejected; cookie helpers', () => {
  const tok = signToken('s', { uid: 7, exp: 2000 });
  assert.equal(verifyToken('s', tok, 1_000_000).uid, 7);
  assert.equal(verifyToken('other', tok, 1_000_000), null);
  assert.equal(verifyToken('s', tok, 2_000_001), null);
  assert.equal(verifyToken('s', `x${tok}`, 1000), null);
  assert.equal(readCookie(`a=1; kt_session=${tok}; b=2`), tok);
  assert.match(sessionCookie('t', 5), /HttpOnly; SameSite=Lax; Max-Age=5$/);
});

test('password login by email or name; wrong password and unknown user are 401', async () => {
  const { svc } = await make();
  assert.equal((await svc.loginPassword({ identifier: 'AN@x.com', password: 'secret1' })).id, 1);
  assert.equal((await svc.loginPassword({ identifier: 'An', password: 'secret1' })).isAdmin, false);
  await status(() => svc.loginPassword({ identifier: 'an@x.com', password: 'nope' }), 401);
  await status(() => svc.loginPassword({ identifier: 'ghost', password: 'secret1' }), 401);
});

test('inactive users cannot log in and soft-deleted ones lose their session', async () => {
  const { svc, rows } = await make();
  await status(() => svc.loginPassword({ identifier: 'off@x.com', password: 'secret1' }), 403);
  const { token } = svc.issueSession(1);
  assert.equal((await svc.sessionUser(token)).id, 1);
  rows[0].deleted_at = new Date();
  assert.equal(await svc.sessionUser(token), null);
  rows[0].deleted_at = null;
  rows[0].active = false;
  assert.equal(await svc.sessionUser(token), null);
});

test('session expires after the ttl', async () => {
  const { svc, tick } = await make();
  const { token, maxAgeSec } = svc.issueSession(1);
  assert.equal(maxAgeSec, 86400);
  tick(86_400_000 + 1000);
  assert.equal(await svc.sessionUser(token), null);
});

test('env admin login creates the admin row once', async () => {
  const { svc, rows } = await make();
  const u = await svc.loginPassword({ identifier: 'ROOT', password: 'pw-admin' });
  assert.equal(u.role, 'admin');
  await svc.loginEnvAdmin({ username: 'root', password: 'pw-admin' });
  assert.equal(rows.filter((r) => r.role === 'admin').length, 1);
  await status(() => svc.loginEnvAdmin({ username: 'root', password: 'bad' }), 401);
});

test('google: checks audience, links by email, creates new accounts', async () => {
  const info = { aud: 'gid', sub: 'g1', email: 'an@x.com', email_verified: 'true', name: 'An G', picture: 'p' };
  let reply = info;
  const { svc, rows } = await make({ fetchImpl: async () => ({ ok: true, json: async () => reply }) });
  assert.equal((await svc.loginGoogle('tok-123456789')).id, 1);
  assert.equal(rows[0].google_sub, 'g1');
  reply = { ...info, sub: 'g2', email: 'new@x.com', name: 'New' };
  assert.equal((await svc.loginGoogle('tok-123456789')).name, 'New');
  reply = { ...info, aud: 'other' };
  await status(() => svc.loginGoogle('tok-123456789'), 401);
  reply = { ...info, email_verified: 'false' };
  await status(() => svc.loginGoogle('tok-123456789'), 401);
});

test('findPublicByIds / me / isAdminAccount / searchUsers shapes', async () => {
  const { svc, rows } = await make();
  assert.deepEqual(await svc.findPublicByIds([1, 3]), [{ id: 1, name: 'An', avatarUrl: null }]);
  assert.equal((await svc.me(1)).name, 'An');
  assert.equal(await svc.me(99), null);
  assert.equal(await svc.isAdminAccount(1), false);
  rows[0].role = 'admin';
  assert.equal(await svc.isAdminAccount(1), true);
  assert.deepEqual((await svc.searchUsers(2, 'a')).map((u) => u.id), [1]);
  assert.deepEqual(await svc.searchUsers(2, '  '), []);
});

test('emails listed in ADMIN_EMAILS are admins (case-insensitive)', async () => {
  const row = { id: 7, name: 'Lan', email: 'Lan@Example.com', role: 'user', active: true, deleted_at: null };
  const authRepo = { findById: async () => row };
  const svc = createAuthService({ authRepo, config: { sessionSecret: 's', adminEmails: ['lan@example.com'] } });
  assert.equal((await svc.me(7)).role, 'admin');
  assert.equal(await svc.isAdminAccount(7), true);
});
