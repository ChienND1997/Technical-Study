import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresenceHub } from './presence.hub.js';

const sock = () => ({ readyState: 1, frames: [], send(m) { this.frames.push(JSON.parse(m)); } });

test('add/remove track presence per user across several sockets', () => {
  const hub = createPresenceHub();
  const a1 = sock(), a2 = sock();
  hub.add(1, a1, { name: 'An' });
  hub.add(1, a2);
  assert.ok(hub.isOnline(1));
  hub.remove(1, a1);
  assert.ok(hub.isOnline(1));
  hub.remove(1, a2);
  assert.equal(hub.isOnline(1), false);
  assert.deepEqual(hub.onlineIds(), []);
});

test('sendTo and sendMany deliver framed events; closed sockets are skipped', () => {
  const hub = createPresenceHub();
  const a = sock(), b = sock(), dead = { readyState: 3, send() { throw new Error('no'); } };
  hub.add(1, a); hub.add(2, b); hub.add(3, dead);
  a.frames.length = 0; b.frames.length = 0;
  hub.sendTo(1, 'notification', { id: 9 });
  hub.sendMany([1, 2, 3, 3], 'group_event', { groupId: 5 });
  assert.deepEqual(a.frames, [{ event: 'notification', data: { id: 9 } }, { event: 'group_event', data: { groupId: 5 } }]);
  assert.deepEqual(b.frames, [{ event: 'group_event', data: { groupId: 5 } }]);
});

test('first and last socket broadcast presence; profiles are listed', () => {
  const hub = createPresenceHub();
  const a = sock(), b = sock();
  hub.add(1, a, { name: 'An', avatarUrl: null });
  hub.add(2, b, { name: 'Bình' });
  assert.ok(a.frames.some((f) => f.event === 'presence' && f.data.userId === 2 && f.data.online));
  assert.deepEqual(hub.onlineUsers().map((u) => u.name), ['An', 'Bình']);
  hub.remove(2, b);
  assert.ok(a.frames.some((f) => f.event === 'presence' && f.data.userId === 2 && !f.data.online));
  assert.deepEqual(hub.onlineUsers().map((u) => u.id), [1]);
});

test('ping is answered with pong; garbage is ignored; pingAll reaches everyone', () => {
  const hub = createPresenceHub();
  const a = sock();
  hub.add(1, a);
  hub.handleMessage(a, '{"type":"ping"}');
  hub.handleMessage(a, 'not json');
  assert.equal(a.frames.at(-1).event, 'pong');
  hub.pingAll();
  assert.equal(a.frames.at(-1).event, 'ping');
});
