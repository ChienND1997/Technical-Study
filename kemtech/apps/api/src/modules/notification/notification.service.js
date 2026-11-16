/** In-app notifications: stored in the DB and pushed live to the user's open sockets. */
export function createNotificationService({ notifRepo, hub }) {
  const push = (row) => hub?.sendTo(row.user_id, 'notification', row);

  return {
    list: (userId) => notifRepo.list(userId),
    async unreadCount(userId) {
      return { count: await notifRepo.unreadCount(userId) };
    },
    /** ids omitted -> mark everything read. */
    async markRead(userId, ids) {
      await notifRepo.markRead(userId, ids?.length ? ids : null);
      return { ok: true };
    },
    async remove(userId, id) {
      await notifRepo.remove(userId, id);
      return { ok: true };
    },
    async clear(userId) {
      await notifRepo.clear(userId);
      return { ok: true };
    },

    /** Stores one notification and pushes it; never notifies a user about their own action. */
    async notify({ userId, actorId = null, type, text, link = null, refId = null }) {
      if (!userId || (actorId != null && actorId === userId)) return null;
      const row = await notifRepo.insert({ userId, actorId, type, text, link, refId });
      push(row);
      return row;
    },

    /** Merges into the latest notification of the same user/type/ref, replacing it (and marking it unread again) instead of piling up duplicates. */
    async notifyGrouped({ userId, actorId = null, type, refId, link = null, textFor }) {
      if (!userId || (actorId != null && actorId === userId)) return null;
      const prior = await notifRepo.findGroup(userId, type, refId);
      const row = prior
        ? await notifRepo.bump(prior.id, { actorId, count: prior.count + 1, text: textFor(prior.count + 1) })
        : await notifRepo.insert({ userId, actorId, type, text: textFor(1), link, refId });
      push(row);
      return row;
    },

    /** Reading a group's chat clears its unread message notifications. */
    async markGroupRead(userId, groupId) {
      const n = await notifRepo.markGroupRead(userId, groupId);
      if (n > 0) hub?.sendTo(userId, 'group_event', { groupId, kind: 'read' });
    },
  };
}
