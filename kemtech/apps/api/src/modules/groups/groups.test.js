import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupsService } from './groups.service.js';

/** In-memory fake of the repository, enough for the permission rules. */
function make() {
  const members = new Map([[1, 'leader'], [2, 'member'], [3, 'member']]); // group 10
  const invites = [];
  const notes = [];
  const done = new Map();
  let assignees = [];
  const names = { 1: 'An', 2: 'Bình', 3: 'Cường', 4: 'Dũng', 5: 'Em' };
  const repo = {
    roleOf: async (g, u) => (g === 10 ? members.get(u) ?? null : null),
    members: async () => [...members].map(([id, role]) => ({ id, role, name: names[id] })),
    getGroup: async () => ({ id: 10, name: 'Nhóm A' }),
    pendingInvite: async (g, u) => invites.find((i) => i.invitee_id === u && i.status === 'pending') ?? null,
    createInvite: async (g, inviter, invitee) => { const i = { id: invites.length + 1, group_id: 10, inviter_id: inviter, invitee_id: invitee, status: 'pending' }; invites.push(i); return i; },
    getInvite: async (id) => invites.find((i) => i.id === id) ?? null,
    resolveInvite: async (id, s) => { invites.find((i) => i.id === id).status = s; },
    addMember: async (g, u) => members.set(u, 'member'),
    removeMember: async (g, u) => members.delete(u),
    setRole: async (g, u, r) => members.set(u, r),
    createAssignment: async (g, u, input, ids) => { assignees = ids; return { id: 1 }; },
    getAssignment: async () => ({ id: 1 }),
    assignments: async () => [{ id: 101, title: 'Bài tập 1', due_date: '2026-11-10' }],
    setDone: async (id, u, d) => { if (!assignees.includes(u)) return false; done.set(u, d); return true; },
    pendingInvites: async () => [],
    cancelInvite: async () => true,
    addMessage: async (g, u, body, mentions, taskMentions) => { lastMentions = mentions; lastTaskMentions = taskMentions; return { id: 1 }; },
    getMessage: async (g, id) => ({ id, user_id: 2, body: 'chào cả nhóm' }),
    deleteMessage: async () => { },
    toggleReaction: async (mid, uid, reaction) => {
      const k = `${mid}:${uid}`;
      if (reactions.get(k) === reaction) {
        reactions.delete(k);
        return { reaction: null };
      }
      reactions.set(k, reaction);
      return { reaction };
    },
  };
  const reactions = new Map();
  const auth = {
    me: async (id) => ({ id, name: names[id] }),
    isAdminAccount: async (id) => id === 5,
    findPublicByIds: async (ids) => ids.filter((i) => names[i]).map((id) => ({ id, name: names[id] })),
  };
  const pushes = [];
  let lastMentions = [];
  let lastTaskMentions = [];
  const svc = createGroupsService({
    groupsRepo: repo,
    authService: auth,
    notifier: { notify: async (n) => notes.push(n), notifyGrouped: async (n) => notes.push({ ...n, text: n.textFor(1) }) },
    hub: { isOnline: (id) => id === 2, sendMany: (ids, e, d) => pushes.push([e, d.kind]) },
  });
  return { svc, members, invites, notes, done, pushes, mentions: () => lastMentions, taskMentions: () => lastTaskMentions };
}

const status = (fn, code) => assert.rejects(fn, (e) => e.statusCode === code);

test('non-members get 404; members cannot manage', async () => {
  const { svc } = make();
  await status(() => svc.get(9, 10), 404);
  await status(() => svc.invite(2, 10, 4), 403);
  await status(() => svc.update(2, 10, { name: 'x', description: '' }), 403);
  await status(() => svc.remove(2, 10), 403);
  assert.equal((await svc.get(2, 10)).members.find((m) => m.id === 2).online, true);
});

test('invite flow: notify invitee with the invite id, accept joins, duplicates and members are rejected', async () => {
  const { svc, members, notes } = make();
  await status(() => svc.invite(1, 10, 2), 400); // already a member
  const r = await svc.invite(1, 10, 4);
  assert.deepEqual([notes[0].type, notes[0].userId, notes[0].refId], ['group_invite', 4, r.inviteId]);
  await status(() => svc.invite(1, 10, 4), 400); // already pending
  await status(() => svc.respond(5, r.inviteId, true), 404); // someone else's invite
  await svc.respond(4, r.inviteId, true);
  assert.equal(members.get(4), 'member');
  assert.equal(notes.at(-1).type, 'group_joined');
  await status(() => svc.respond(4, r.inviteId, true), 400); // already handled
  const r2 = await svc.invite(1, 10, 5);
  await svc.respond(5, r2.inviteId, false);
  assert.equal(members.has(5), false);
  assert.equal(notes.at(-1).type, 'group_declined');
});

test('roles: only the leader promotes, transfers; the leader cannot just leave', async () => {
  const { svc, members } = make();
  await status(() => svc.setRole(2, 10, 3, 'deputy'), 403);
  await svc.setRole(1, 10, 2, 'deputy');
  assert.equal(members.get(2), 'deputy');
  await status(() => svc.removeMember(1, 10, 1), 400); // leader leaving
  await status(() => svc.removeMember(2, 10, 1), 403); // nobody removes the leader
  await svc.removeMember(2, 10, 3); // deputy removes a member
  assert.equal(members.has(3), false);
  await svc.transfer(1, 10, 2);
  assert.deepEqual([members.get(2), members.get(1)], ['leader', 'deputy']);
  await svc.removeMember(1, 10, 1); // the old leader (now deputy) can leave
  assert.equal(members.has(1), false);
});

test('a deputy cannot remove another deputy', async () => {
  const { svc, members } = make();
  members.set(2, 'deputy');
  members.set(3, 'deputy');
  await status(() => svc.removeMember(2, 10, 3), 403);
});

test('assignments: managers assign to members only; assignees mark done; others cannot', async () => {
  const { svc, notes, done } = make();
  await status(() => svc.createAssignment(2, 10, { title: 't' }), 403);
  await status(() => svc.createAssignment(1, 10, { title: 't', assigneeIds: [2, 99] }), 400);
  await svc.createAssignment(1, 10, { title: 'Đọc bài 1', assigneeIds: [2] });
  assert.deepEqual(notes.filter((n) => n.type === 'assignment').map((n) => n.userId), [2]);
  await svc.setDone(2, 10, 1, true);
  assert.equal(done.get(2), true);
  await status(() => svc.setDone(3, 10, 1, true), 400); // not assigned to 3
});

test('chat: members only; only the author or a site admin can delete', async () => {
  const { svc, pushes, members } = make();
  await status(() => svc.sendMessage(9, 10, { body: 'hi' }), 404);
  await svc.sendMessage(2, 10, { body: 'hi' });
  assert.ok(pushes.some(([e, k]) => e === 'group_event' && k === 'message'));
  await status(() => svc.deleteMessage(3, 10, 1), 403); // message belongs to user 2
  await svc.deleteMessage(2, 10, 1); // the author
  await status(() => svc.deleteMessage(1, 10, 1), 403); // a group leader who is not the author nor a site admin
  members.set(5, 'member'); // a site admin who is in the group may delete any message
  await svc.deleteMessage(5, 10, 1);
});

test('a chat message notifies the other members (not the sender)', async () => {
  const { svc, notes } = make();
  await svc.sendMessage(2, 10, { body: 'chào cả nhóm' });
  const got = notes.filter((n) => n.type === 'group_message');
  assert.deepEqual(got.map((n) => n.userId).sort(), [1, 3]);
  assert.match(got[0].text, /Bình trong “Nhóm A”: chào cả nhóm/);
});

test('chat @mentions notify the mentioned member once; the generic message notice skips them', async () => {
  const { svc, notes, mentions } = make();
  await svc.sendMessage(1, 10, { body: 'chào @Bình và @Zed', mentionIds: [2, 99] });
  assert.deepEqual(mentions(), [{ id: 2, name: 'Bình' }]); // 99 is not a member
  assert.deepEqual(notes.filter((n) => n.type === 'group_mention').map((n) => n.userId), [2]);
  assert.deepEqual(notes.filter((n) => n.type === 'group_message').map((n) => n.userId), [3]);
});

test('a site admin who is a group member acts as leader; leaving still follows the real role', async () => {
  const { svc, members } = make();
  members.set(5, 'member');
  await svc.setRole(5, 10, 2, 'deputy'); // only a leader may do this
  assert.equal(members.get(2), 'deputy');
  const g = await svc.get(5, 10);
  assert.deepEqual([g.myRole, g.realRole], ['leader', 'member']);
  await svc.transfer(5, 10, 3); // the real leader (1) steps down to deputy
  assert.deepEqual([members.get(3), members.get(1)], ['leader', 'deputy']);
  await svc.removeMember(5, 10, 5); // the admin is a plain member, so can leave
  assert.equal(members.has(5), false);
});

test('reactions: members can react and toggle reactions; non-members and author cannot', async () => {
  const { svc, pushes, notes } = make();
  await status(() => svc.reactMessage(9, 10, 1, 'like'), 404); // non-member
  await status(() => svc.reactMessage(2, 10, 1, 'like'), 400); // author cannot react to own message
  const r1 = await svc.reactMessage(1, 10, 1, 'like');
  assert.deepEqual(r1, { ok: true, reaction: 'like' });
  assert.ok(pushes.some(([e, k]) => e === 'group_event' && k === 'message'));
  const reactNotes = notes.filter((n) => n.type === 'group_reaction');
  assert.equal(reactNotes.length, 1);
  assert.equal(reactNotes[0].userId, 2); // notifies message author
  assert.match(reactNotes[0].text, /An đã thích 👍/);

  // change to love
  const r2 = await svc.reactMessage(1, 10, 1, 'love');
  assert.deepEqual(r2, { ok: true, reaction: 'love' });
  // toggle off
  const r3 = await svc.reactMessage(1, 10, 1, 'love');
  assert.deepEqual(r3, { ok: true, reaction: null });
});

test('task mentions: message tags group assignments by id and title', async () => {
  const { svc, taskMentions } = make();
  await svc.sendMessage(2, 10, { body: 'Mọi người nhớ làm #[Bài tập 1] nhé', taskIds: [101] });
  assert.deepEqual(taskMentions(), [{ id: 101, title: 'Bài tập 1', dueDate: '2026-11-10', lessonId: undefined, lessonTitle: undefined }]);
});
