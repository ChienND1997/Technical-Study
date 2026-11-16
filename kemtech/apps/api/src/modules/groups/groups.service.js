import { AppError, BadRequestError, NotFoundError } from '../../common/errors.js';

const MESSAGE_PAGE = 50;
const isManager = (role) => role === 'leader' || role === 'deputy';

/**
 * Study groups. Roles: leader (the creator, one per group), deputy (granted by the leader: invites,
 * removes members, manages assignments) and member. Everything is checked here, not in the routes.
 */
export function createGroupsService({ groupsRepo, authService, notifier = { notify: async () => { } }, hub }) {
  /**
   * Returns the caller's effective role, or 404 so non-members cannot tell whether a group exists.
   * A site admin who is a member of the group gets the leader's powers.
   */
  async function roleOrThrow(groupId, userId) {
    const role = await groupsRepo.roleOf(groupId, userId);
    if (!role) throw new NotFoundError('Không tìm thấy nhóm');
    return (await authService.isAdminAccount?.(userId)) ? 'leader' : role;
  }
  async function managerOrThrow(groupId, userId) {
    const role = await roleOrThrow(groupId, userId);
    if (!isManager(role)) throw new AppError('Chỉ trưởng nhóm hoặc phó nhóm được phép', 403);
    return role;
  }
  async function leaderOrThrow(groupId, userId) {
    const role = await roleOrThrow(groupId, userId);
    if (role !== 'leader') throw new AppError('Chỉ trưởng nhóm được phép', 403);
  }
  const nameOf = async (userId) => (await authService.me(userId))?.name ?? 'Ai đó';
  /** Live "something changed" ping so open group pages refetch. */
  async function ping(groupId, kind) {
    const ids = (await groupsRepo.members(groupId)).map((m) => m.id);
    hub?.sendMany(ids, 'group_event', { groupId, kind });
    return ids;
  }

  return {
    async list(userId) {
      const rows = await groupsRepo.listForUser(userId);
      const admin = !!(await authService.isAdminAccount?.(userId));
      return admin ? rows.map((r) => ({ ...r, my_role: 'leader' })) : rows;
    },

    async create(userId, input) {
      return groupsRepo.createGroup(userId, input);
    },

    /** Group header, members (with online flag) and, for managers, the pending invites. */
    async get(userId, groupId) {
      const myRole = await roleOrThrow(groupId, userId);
      const [group, members, invites] = await Promise.all([
        groupsRepo.getGroup(groupId),
        groupsRepo.members(groupId),
        isManager(myRole) ? groupsRepo.pendingInvites(groupId) : Promise.resolve([]),
      ]);
      return {
        group,
        myRole, // effective role (site admins count as leader)
        realRole: await groupsRepo.roleOf(groupId, userId),
        members: members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatar_url, role: m.role, blocked: !!m.blocked, online: !!hub?.isOnline(m.id) })),
        invites,
      };
    },

    async update(userId, groupId, input) {
      await managerOrThrow(groupId, userId);
      await groupsRepo.updateGroup(groupId, input);
      await ping(groupId, 'group');
      return { ok: true };
    },

    async remove(userId, groupId) {
      await leaderOrThrow(groupId, userId);
      const ids = (await groupsRepo.members(groupId)).map((m) => m.id);
      await groupsRepo.deleteGroup(groupId);
      hub?.sendMany(ids, 'group_event', { groupId, kind: 'deleted' });
      return { ok: true };
    },

    // ---- invites
    async invite(userId, groupId, inviteeId) {
      await managerOrThrow(groupId, userId);
      if (inviteeId === userId) throw new BadRequestError('Bạn đã ở trong nhóm này');
      const [target] = await authService.findPublicByIds([inviteeId]);
      if (!target) throw new NotFoundError('Không tìm thấy người dùng');
      if (await groupsRepo.roleOf(groupId, inviteeId)) throw new BadRequestError('Người này đã ở trong nhóm');
      if (await groupsRepo.pendingInvite(groupId, inviteeId)) throw new BadRequestError('Đã gửi lời mời cho người này, đang chờ phản hồi');
      const group = await groupsRepo.getGroup(groupId);
      const invite = await groupsRepo.createInvite(groupId, userId, inviteeId);
      await notifier.notify({
        userId: inviteeId,
        actorId: userId,
        type: 'group_invite',
        text: `${await nameOf(userId)} mời bạn vào nhóm “${group.name}”`,
        link: `/groups/${groupId}`,
        refId: invite.id,
      });
      await ping(groupId, 'invite');
      return { ok: true, inviteId: invite.id };
    },

    async cancelInvite(userId, groupId, inviteId) {
      await managerOrThrow(groupId, userId);
      if (!(await groupsRepo.cancelInvite(groupId, inviteId))) throw new NotFoundError('Không tìm thấy lời mời');
      await ping(groupId, 'invite');
      return { ok: true };
    },

    /** The invited user accepts or rejects; the inviter is told. */
    async respond(userId, inviteId, accept) {
      const invite = await groupsRepo.getInvite(inviteId);
      if (!invite || invite.invitee_id !== userId) throw new NotFoundError('Không tìm thấy lời mời');
      if (invite.status !== 'pending') throw new BadRequestError('Lời mời này đã được xử lý');
      const group = await groupsRepo.getGroup(invite.group_id);
      if (!group) throw new NotFoundError('Nhóm không còn tồn tại');
      await groupsRepo.resolveInvite(inviteId, accept ? 'accepted' : 'rejected');
      if (accept) await groupsRepo.addMember(invite.group_id, userId);
      const me = await nameOf(userId);
      await notifier.notify({
        userId: invite.inviter_id,
        actorId: userId,
        type: accept ? 'group_joined' : 'group_declined',
        text: accept ? `${me} đã tham gia nhóm “${group.name}”` : `${me} đã từ chối lời mời vào nhóm “${group.name}”`,
        link: `/groups/${invite.group_id}`,
      });
      await ping(invite.group_id, 'members');
      return { ok: true, groupId: invite.group_id, accepted: !!accept };
    },

    // ---- members and roles
    /** Leaves the group (self) or removes someone. Only the leader can remove a deputy; nobody removes the leader. */
    async removeMember(userId, groupId, targetId) {
      const myRole = await roleOrThrow(groupId, userId);
      const targetRole = await groupsRepo.roleOf(groupId, targetId);
      if (!targetRole) throw new NotFoundError('Người này không ở trong nhóm');
      if (targetId === userId) {
        if (targetRole === 'leader') throw new BadRequestError('Trưởng nhóm cần trao quyền cho người khác trước khi rời nhóm');
      } else {
        if (!isManager(myRole)) throw new AppError('Chỉ trưởng nhóm hoặc phó nhóm được phép', 403);
        if (targetRole === 'leader') throw new AppError('Không thể xóa trưởng nhóm', 403);
        if (targetRole === 'deputy' && myRole !== 'leader') throw new AppError('Chỉ trưởng nhóm được xóa phó nhóm', 403);
      }
      const before = (await groupsRepo.members(groupId)).map((m) => m.id);
      await groupsRepo.removeMember(groupId, targetId);
      hub?.sendMany(before, 'group_event', { groupId, kind: 'members' });
      return { ok: true };
    },

    /** Leader promotes a member to deputy or demotes a deputy. */
    async setRole(userId, groupId, targetId, role) {
      await leaderOrThrow(groupId, userId);
      const targetRole = await groupsRepo.roleOf(groupId, targetId);
      if (!targetRole) throw new NotFoundError('Người này không ở trong nhóm');
      if (targetRole === 'leader') throw new BadRequestError('Không thể đổi quyền của trưởng nhóm');
      await groupsRepo.setRole(groupId, targetId, role);
      await notifier.notify({
        userId: targetId,
        actorId: userId,
        type: 'group_role',
        text: role === 'deputy' ? `Bạn được làm phó nhóm của nhóm “${(await groupsRepo.getGroup(groupId)).name}”` : `Bạn không còn là phó nhóm của nhóm “${(await groupsRepo.getGroup(groupId)).name}”`,
        link: `/groups/${groupId}`,
      });
      await ping(groupId, 'members');
      return { ok: true };
    },

    /** Leader hands the leadership to another member and becomes a deputy. */
    async transfer(userId, groupId, targetId) {
      await leaderOrThrow(groupId, userId);
      const targetRole = await groupsRepo.roleOf(groupId, targetId);
      if (!targetRole) throw new NotFoundError('Người này không ở trong nhóm');
      if (targetRole === 'leader') throw new BadRequestError('Người này đang là trưởng nhóm');
      // the current leader (not necessarily the caller, who may be a site admin) steps down to deputy
      const current = (await groupsRepo.members(groupId)).find((m) => m.role === 'leader');
      await groupsRepo.setRole(groupId, targetId, 'leader');
      if (current) await groupsRepo.setRole(groupId, current.id, 'deputy');
      const group = await groupsRepo.getGroup(groupId);
      await notifier.notify({ userId: targetId, actorId: userId, type: 'group_role', text: `Bạn là trưởng nhóm mới của nhóm “${group.name}”`, link: `/groups/${groupId}` });
      await ping(groupId, 'members');
      return { ok: true };
    },

    // ---- chat
    async messages(userId, groupId, before) {
      await roleOrThrow(groupId, userId);
      await notifier.markGroupRead?.(userId, groupId); // reading the chat clears its notification
      return groupsRepo.messages(groupId, before, MESSAGE_PAGE);
    },
    /** `mentionIds` are group members picked from the @ autocomplete whose "@name" is still in the text.
     *  `taskIds` are group assignments tagged in the message. */
    async sendMessage(userId, groupId, { body, mentionIds = [], taskIds = [] }) {
      await roleOrThrow(groupId, userId);
      const [group, actor, members] = await Promise.all([groupsRepo.getGroup(groupId), nameOf(userId), groupsRepo.members(groupId)]);
      const mentions = members
        .filter((m) => m.id !== userId && mentionIds.includes(m.id) && body.includes(`@${m.name}`))
        .map((m) => ({ id: m.id, name: m.name }));
      let taskMentions = [];
      if (taskIds?.length) {
        const assignments = await groupsRepo.assignments(groupId, userId);
        taskMentions = assignments
          .filter((a) => taskIds.includes(a.id) && (body.includes(a.title) || body.includes(`#[${a.title}]`) || body.includes(`#${a.title}`)))
          .map((a) => ({
            id: a.id,
            title: a.title,
            dueDate: a.due_date,
            lessonId: a.lesson_id,
            lessonTitle: a.lesson_title,
          }));
      }
      const created = await groupsRepo.addMessage(groupId, userId, body, mentions, taskMentions);
      const mentioned = new Set(mentions.map((m) => m.id));
      for (const m of mentions) {
        await notifier.notify({ userId: m.id, actorId: userId, type: 'group_mention', text: `${actor} đã nhắc đến bạn trong nhóm “${group.name}”`, link: `/groups/${groupId}` });
      }
      const snippet = body.length > 60 ? `${body.slice(0, 60)}…` : body;
      for (const m of members.filter((x) => x.id !== userId && !mentioned.has(x.id))) {
        await notifier.notifyGrouped?.({
          userId: m.id,
          actorId: userId,
          type: 'group_message',
          refId: groupId,
          link: `/groups/${groupId}`,
          textFor: (n) => (n === 1 ? `${actor} trong “${group.name}”: ${snippet}` : `${n} tin nhắn mới trong nhóm “${group.name}”`),
        });
      }
      await ping(groupId, 'message');
      return created;
    },
    async reactMessage(userId, groupId, messageId, reaction) {
      await roleOrThrow(groupId, userId);
      const m = await groupsRepo.getMessage(groupId, messageId);
      if (!m) throw new NotFoundError('Không tìm thấy tin nhắn');
      if (m.user_id === userId) {
        throw new BadRequestError('Không thể tự thả cảm xúc cho tin nhắn của chính mình');
      }
      const res = await groupsRepo.toggleReaction(messageId, userId, reaction);
      if (res.reaction) {
        const [group, actor] = await Promise.all([groupsRepo.getGroup(groupId), nameOf(userId)]);
        const labels = {
          like: 'thích 👍',
          love: 'thả tim ❤️',
          haha: 'haha 😂',
          wow: 'wow 😮',
          sad: 'buồn 😢',
          angry: 'phẫn nộ 😡',
        };
        const label = labels[res.reaction] || res.reaction;
        const snippet = m.body ? (m.body.length > 30 ? `${m.body.slice(0, 30)}…` : m.body) : 'tin nhắn';
        await notifier.notify({
          userId: m.user_id,
          actorId: userId,
          type: 'group_reaction',
          refId: messageId,
          text: `${actor} đã ${label} tin nhắn "${snippet}" trong nhóm “${group.name}”`,
          link: `/groups/${groupId}?mid=${messageId}`,
        });
      }
      await ping(groupId, 'message');
      return { ok: true, ...res };
    },
    async deleteMessage(userId, groupId, messageId) {
      await roleOrThrow(groupId, userId);
      const m = await groupsRepo.getMessage(groupId, messageId);
      if (!m) throw new NotFoundError('Không tìm thấy tin nhắn');
      // only the author of a message or a site admin may delete it (group leaders and deputies may not)
      if (m.user_id !== userId && !(await authService.isAdminAccount(userId))) throw new AppError('Chỉ người gửi hoặc admin mới xóa được tin nhắn', 403);
      await groupsRepo.deleteMessage(messageId);
      await ping(groupId, 'message');
      return { ok: true };
    },

    // ---- assignments
    async assignments(userId, groupId) {
      const role = await roleOrThrow(groupId, userId);
      const rows = await groupsRepo.assignments(groupId, userId);
      // only managers see who has (not) finished; members see their own status and the totals
      return rows.map((r) => (isManager(role) ? r : { ...r, people: [] }));
    },

    /** Every assignee must be a group member; without `assigneeIds` it goes to the whole group. */
    async createAssignment(userId, groupId, input) {
      await managerOrThrow(groupId, userId);
      const memberIds = (await groupsRepo.members(groupId)).map((m) => m.id);
      const assignees = input.assigneeIds?.length ? input.assigneeIds : memberIds;
      if (!assignees.every((id) => memberIds.includes(id))) throw new BadRequestError('Có người được giao không thuộc nhóm');
      const created = await groupsRepo.createAssignment(groupId, userId, input, assignees);
      const group = await groupsRepo.getGroup(groupId);
      const due = input.dueDate ? `, hạn ${input.dueDate.split('-').reverse().join('/')}` : '';
      const actor = await nameOf(userId);
      // the person who assigns it does not need a notice about their own action
      for (const id of assignees.filter((a) => a !== userId)) {
        await notifier.notify({ userId: id, actorId: userId, type: 'assignment', text: `${actor} giao bài tập mới trong nhóm “${group.name}”: ${input.title}${due}`, link: `/groups/${groupId}` });
      }
      await ping(groupId, 'assignment');
      return { ...created, notified: assignees.filter((a) => a !== userId).length };
    },

    async updateAssignment(userId, groupId, id, input) {
      await managerOrThrow(groupId, userId);
      if (!(await groupsRepo.getAssignment(groupId, id))) throw new NotFoundError('Không tìm thấy bài tập');
      await groupsRepo.updateAssignment(id, input);
      if (input.assigneeIds?.length) {
        const memberIds = (await groupsRepo.members(groupId)).map((m) => m.id);
        if (!input.assigneeIds.every((a) => memberIds.includes(a))) throw new BadRequestError('Có người được giao không thuộc nhóm');
        await groupsRepo.setAssignees(id, input.assigneeIds);
      }
      await ping(groupId, 'assignment');
      return { ok: true };
    },

    async deleteAssignment(userId, groupId, id) {
      await managerOrThrow(groupId, userId);
      if (!(await groupsRepo.getAssignment(groupId, id))) throw new NotFoundError('Không tìm thấy bài tập');
      await groupsRepo.deleteAssignment(id);
      await ping(groupId, 'assignment');
      return { ok: true };
    },

    /** An assignee marks their own part done (or undone). */
    async setDone(userId, groupId, id, done) {
      await roleOrThrow(groupId, userId);
      if (!(await groupsRepo.getAssignment(groupId, id))) throw new NotFoundError('Không tìm thấy bài tập');
      if (!(await groupsRepo.setDone(id, userId, done))) throw new BadRequestError('Bài tập này không được giao cho bạn');
      await ping(groupId, 'assignment');
      return { ok: true };
    },
  };
}
