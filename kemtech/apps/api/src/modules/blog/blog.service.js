import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors.js';
import { levelInfo } from '../game/levels.js';

const minutesOf = (body) => Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200));
const postLink = (type, id) => (type === 'lesson' ? `/lessons/${id}` : `/blog/post/${id}`);

/** Community blog: posts with admin moderation, plus comments with @mentions on posts and lessons. */
export function createBlogService({ blogRepo, notifier, authService }) {
  const isAdmin = (userId) => authService.isAdminAccount(userId);
  const withMinutes = (p) => ({ ...p, minutes: minutesOf(p.body ?? p.summary ?? '') });
  const nameOf = async (userId) => (await authService.me(userId))?.name ?? 'Một người dùng';

  async function ownPost(userId, id) {
    const post = await blogRepo.get(id);
    if (!post) throw new NotFoundError('Không tìm thấy bài viết');
    if (post.user_id !== userId && !(await isAdmin(userId))) throw new ForbiddenError('Bạn không có quyền với bài viết này');
    return post;
  }

  return {
    async listApproved() {
      return (await blogRepo.listApproved()).map(withMinutes);
    },
    async listMine(userId) {
      return (await blogRepo.listByUser(userId)).map(withMinutes);
    },
    /** Approved posts are public; others only for their author and admins. */
    async get(userId, id) {
      const post = await blogRepo.get(id);
      if (!post || (post.status !== 'approved' && post.user_id !== userId && !(await isAdmin(userId)))) {
        throw new NotFoundError('Không tìm thấy bài viết');
      }
      return withMinutes(post);
    },
    /** Admin posts go live at once; everyone else's wait for review. */
    async create(userId, input) {
      const status = (await isAdmin(userId)) ? 'approved' : 'pending';
      return blogRepo.insert(userId, input, status);
    },
    /** Only the author edits; the edit sends the post back to the review queue (admins stay approved). */
    async update(userId, id, input) {
      const post = await blogRepo.get(id);
      if (!post) throw new NotFoundError('Không tìm thấy bài viết');
      if (post.user_id !== userId) throw new ForbiddenError('Bạn chỉ sửa được bài của mình');
      const status = (await isAdmin(userId)) ? 'approved' : 'pending';
      return blogRepo.update(id, input, status);
    },
    async remove(userId, id) {
      await ownPost(userId, id);
      await blogRepo.remove(id);
      return { ok: true };
    },

    // ---- moderation (routes are already admin-only)
    listForReview: (status) => blogRepo.listByStatus(status),
    async pendingCount() {
      return { count: await blogRepo.pendingCount() };
    },
    async review(adminId, id, { approve, reason }) {
      const post = await blogRepo.get(id);
      if (!post) throw new NotFoundError('Không tìm thấy bài viết');
      const text = (reason ?? '').trim();
      if (!approve && text.length < 3) throw new BadRequestError('Vui lòng nhập lý do từ chối');
      await blogRepo.setReview(id, adminId, approve ? 'approved' : 'rejected', approve ? null : text);
      await notifier.notify({
        userId: post.user_id,
        actorId: adminId,
        type: approve ? 'post_approved' : 'post_rejected',
        text: approve ? `Bài viết “${post.title}” đã được duyệt` : `Bài viết “${post.title}” chưa được duyệt: ${text}`,
        link: `/blog/post/${id}`,
        refId: id,
      });
      return { ok: true, status: approve ? 'approved' : 'rejected' };
    },

    // ---- comments
    /** Each comment carries the author's level (not raw XP), for the achievement badge next to their name. */
    async listComments(type, id) {
      const rows = await blogRepo.listComments(type, id);
      return rows.map(({ author_xp, ...c }) => ({ ...c, author_level: levelInfo(author_xp).level }));
    },
    /** Saves a comment, then notifies the post owner and every mentioned user (once each, never the author). */
    async addComment(userId, { type, id, body, mentionIds = [] }) {
      let title;
      let ownerId = null;
      if (type === 'post') {
        const post = await blogRepo.get(id);
        if (!post || post.status !== 'approved') throw new NotFoundError('Không tìm thấy bài viết');
        title = post.title;
        ownerId = post.user_id;
      } else {
        title = await blogRepo.lessonTitle(id);
        if (title == null) throw new NotFoundError('Không tìm thấy bài học');
      }
      const mentions = (await authService.findPublicByIds([...new Set(mentionIds)]))
        .filter((u) => u.id !== userId && body.includes(`@${u.name}`))
        .map((u) => ({ id: u.id, name: u.name }));
      const comment = await blogRepo.addComment(userId, type, id, body, mentions);

      const actor = await nameOf(userId);
      const link = postLink(type, id);
      const notified = new Set([userId]); // never notify yourself about your own comment
      // notifyGrouped merges into the same unread notification (per recipient/type/target) instead of
      // piling up a duplicate row — e.g. a double-submitted comment refreshes the one notification
      // rather than showing the same "mentioned you" line twice.
      for (const m of mentions) {
        await notifier.notifyGrouped({ userId: m.id, actorId: userId, type: 'mention', refId: id, link, textFor: () => `${actor} đã nhắc đến bạn trong bình luận “${title}”` });
        notified.add(m.id);
      }
      if (ownerId && !notified.has(ownerId)) {
        await notifier.notifyGrouped({ userId: ownerId, actorId: userId, type: 'comment', refId: id, link, textFor: () => `${actor} đã bình luận bài viết “${title}” của bạn` });
        notified.add(ownerId);
      }
      // Anyone else already in this thread (commented before, not yet notified above) hears about new activity too.
      const noun = type === 'post' ? 'bài viết' : 'bài học';
      for (const uid of await blogRepo.priorCommenters(type, id, userId)) {
        if (notified.has(uid)) continue;
        notified.add(uid);
        await notifier.notifyGrouped({ userId: uid, actorId: userId, type: 'comment', refId: id, link, textFor: () => `${actor} cũng đã bình luận ${noun} “${title}” mà bạn từng bình luận` });
      }
      return comment;
    },
    async removeComment(userId, commentId) {
      const c = await blogRepo.getComment(commentId);
      if (!c) throw new NotFoundError('Không tìm thấy bình luận');
      if (c.user_id !== userId && !(await isAdmin(userId))) throw new ForbiddenError('Bạn không thể xóa bình luận này');
      await blogRepo.removeComment(commentId);
      return { ok: true };
    },
  };
}
