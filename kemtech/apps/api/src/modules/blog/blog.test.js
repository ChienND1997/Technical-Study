import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlogService } from './blog.service.js';

function make() {
  const posts = new Map([[1, { id: 1, user_id: 2, title: 'Bài A', body: 'từ '.repeat(450), status: 'approved' }]]);
  const comments = [];
  const notes = [];
  let review = null;
  const names = { 1: 'Admin', 2: 'Bình', 3: 'Cường', 4: 'Dũng' };
  const repo = {
    get: async (id) => posts.get(id) ?? null,
    insert: async (u, input, status) => { posts.set(9, { id: 9, user_id: u, status, ...input }); return { id: 9, status }; },
    update: async (id, input, status) => { Object.assign(posts.get(id), input, { status }); return { id: id, status }; },
    remove: async (id) => posts.delete(id),
    setReview: async (...a) => { review = a; },
    lessonTitle: async (id) => (id === 5 ? 'Bài học 5' : null),
    addComment: async (u, type, id, body, mentions) => { const c = { id: comments.length + 1, user_id: u, type, target_id: id, body, mentions }; comments.push(c); return c; },
    getComment: async (id) => comments.find((c) => c.id === id) ?? null,
    removeComment: async (id) => comments.splice(comments.findIndex((c) => c.id === id), 1),
    priorCommenters: async (type, id, excludeUserId) =>
      [...new Set(comments.filter((c) => c.type === type && c.target_id === id && c.user_id !== excludeUserId).map((c) => c.user_id))],
  };
  const auth = {
    isAdminAccount: async (id) => id === 1,
    me: async (id) => ({ id, name: names[id] }),
    findPublicByIds: async (ids) => ids.filter((i) => names[i]).map((id) => ({ id, name: names[id] })),
  };
  const notifier = { notify: async (n) => notes.push(n), notifyGrouped: async (n) => notes.push({ ...n, text: n.textFor(1) }) };
  const svc = createBlogService({ blogRepo: repo, notifier, authService: auth });
  return { svc, posts, notes, comments, review: () => review };
}

test('user posts start pending, admin posts are approved, editing re-queues', async () => {
  const { svc, posts } = make();
  const input = { title: 'T', summary: '', body: 'b', sourceUrl: null, category: 'db' };
  assert.equal((await svc.create(3, input)).status, 'pending');
  assert.equal((await svc.create(1, input)).status, 'approved');
  assert.equal((await svc.update(2, 1, input)).status, 'pending');
  assert.equal(posts.get(1).status, 'pending');
  await assert.rejects(() => svc.update(3, 1, input), { message: /bài của mình/ });
});

test('unapproved posts are hidden from strangers; minutes derived from the body', async () => {
  const { svc, posts } = make();
  assert.equal((await svc.get(3, 1)).minutes, 3);
  posts.get(1).status = 'pending';
  await assert.rejects(() => svc.get(3, 1), { message: /Không tìm thấy/ });
  assert.ok(await svc.get(2, 1));
  assert.ok(await svc.get(1, 1));
});

test('review: reject needs a reason, notifies the author', async () => {
  const { svc, notes, review } = make();
  await assert.rejects(() => svc.review(1, 1, { approve: false }), { message: /lý do/ });
  await svc.review(1, 1, { approve: false, reason: 'Trùng nội dung' });
  assert.deepEqual(review(), [1, 1, 'rejected', 'Trùng nội dung']);
  await svc.review(1, 1, { approve: true });
  assert.deepEqual(notes.map((n) => [n.userId, n.type]), [[2, 'post_rejected'], [2, 'post_approved']]);
});

test('comments notify the owner and mentioned users once, never the author', async () => {
  const { svc, notes, comments } = make();
  await svc.addComment(3, { type: 'post', id: 1, body: 'hay @Dũng @Bình', mentionIds: [4, 2, 3, 4] });
  assert.deepEqual(comments[0].mentions.map((m) => m.id).sort(), [2, 4]);
  assert.deepEqual(notes.map((n) => [n.userId, n.type]).sort(), [[2, 'mention'], [4, 'mention']]);
  notes.length = 0;
  await svc.addComment(3, { type: 'post', id: 1, body: 'hello', mentionIds: [] });
  assert.deepEqual(notes.map((n) => [n.userId, n.type, n.link]), [[2, 'comment', '/blog/post/1']]);
  notes.length = 0;
  await svc.addComment(3, { type: 'lesson', id: 5, body: 'ok @Dũng', mentionIds: [4] });
  assert.deepEqual(notes.map((n) => [n.userId, n.link]), [[4, '/lessons/5']]);
  await assert.rejects(() => svc.addComment(3, { type: 'lesson', id: 6, body: 'x' }), { message: /bài học/ });
});

test('a later comment also notifies everyone else already in the thread, but not twice and never the new commenter', async () => {
  const { svc, notes } = make();
  // Cường (3) comments first on Bình's (2) post.
  await svc.addComment(3, { type: 'post', id: 1, body: 'đầu tiên', mentionIds: [] });
  assert.deepEqual(notes.map((n) => [n.userId, n.type]), [[2, 'comment']]); // only the owner so far
  notes.length = 0;
  // Dũng (4) comments next: owner (2) and the earlier commenter (3) both hear about it, once each.
  await svc.addComment(4, { type: 'post', id: 1, body: 'thứ hai', mentionIds: [] });
  assert.deepEqual(notes.map((n) => [n.userId, n.type]).sort(), [[2, 'comment'], [3, 'comment']]);
  notes.length = 0;
  // Bình (2, the owner) comments too: Cường and Dũng (prior commenters) hear about it; the owner never
  // notifies themselves even though they're also technically a "prior commenter" from this point on.
  await svc.addComment(2, { type: 'post', id: 1, body: 'thứ ba', mentionIds: [] });
  assert.deepEqual(notes.map((n) => [n.userId, n.type]).sort(), [[3, 'comment'], [4, 'comment']]);
  // A mention takes priority over the generic thread notification: no one is notified twice for one comment.
  notes.length = 0;
  await svc.addComment(3, { type: 'post', id: 1, body: 'thứ tư @Dũng', mentionIds: [4] });
  assert.deepEqual(notes.map((n) => [n.userId, n.type]).sort(), [[2, 'comment'], [4, 'mention']]);
});

test('only the comment author or an admin deletes a comment', async () => {
  const { svc, comments } = make();
  await svc.addComment(3, { type: 'post', id: 1, body: 'a' });
  await svc.addComment(3, { type: 'post', id: 1, body: 'b' });
  await assert.rejects(() => svc.removeComment(4, 1), { message: /không thể xóa/ });
  await svc.removeComment(3, 1);
  await svc.removeComment(1, 2);
  assert.equal(comments.length, 0);
});
