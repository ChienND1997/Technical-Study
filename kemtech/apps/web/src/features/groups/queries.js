import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as g from './api.js';

// every key starts with 'groups', so one invalidation (also triggered by the WebSocket) refreshes them all
export const groupKeys = {
  list: ['groups', 'list'],
  detail: (id) => ['groups', 'detail', Number(id)],
  messages: (id) => ['groups', 'messages', Number(id)],
  tasks: (id) => ['groups', 'tasks', Number(id)],
};

export const useGroupsQuery = () => useQuery({ queryKey: groupKeys.list, queryFn: g.fetchGroups });
export const useGroupQuery = (id) => useQuery({ queryKey: groupKeys.detail(id), queryFn: () => g.fetchGroup(id), retry: false });
/** Chat history; the WebSocket pushes refreshes, the slow poll only covers a dropped connection. */
export const useMessagesQuery = (id) => useQuery({ queryKey: groupKeys.messages(id), queryFn: () => g.fetchMessages(id), refetchInterval: 30000 });
export const useAssignmentsQuery = (id) => useQuery({ queryKey: groupKeys.tasks(id), queryFn: () => g.fetchAssignments(id) });

/** A mutation that refreshes every group query (and the bell) on success. */
function useGroupMutation(fn, { alsoNotifications = false, success } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    meta: { success }, // shown as a toast by the global mutation cache; errors are toasted too
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      if (alsoNotifications) qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export const useCreateGroup = () => useGroupMutation(g.createGroup, { success: 'Đã tạo nhóm' });
export const useUpdateGroup = () => useGroupMutation(({ id, ...body }) => g.updateGroup(id, body), { success: 'Đã cập nhật nhóm' });
export const useDeleteGroup = () => useGroupMutation(g.deleteGroup, { success: 'Đã xóa nhóm' });
export const useInviteUser = () => useGroupMutation(({ id, userId }) => g.inviteUser(id, userId), { success: 'Đã gửi lời mời vào nhóm' });
export const useCancelInvite = () => useGroupMutation(({ id, inviteId }) => g.cancelInvite(id, inviteId), { success: 'Đã hủy lời mời' });
export const useRemoveMember = () => useGroupMutation(({ id, userId }) => g.removeMember(id, userId), { success: 'Đã xóa thành viên khỏi nhóm' });
export const useSetMemberRole = () => useGroupMutation(({ id, userId, role }) => g.setMemberRole(id, userId, role), { success: 'Đã đổi vai trò thành viên' });
export const useTransferLeader = () => useGroupMutation(({ id, userId }) => g.transferLeader(id, userId), { success: 'Đã chuyển quyền trưởng nhóm' });
export const useSendMessage = () => useGroupMutation(({ id, body, mentionIds, taskIds }) => g.sendMessage(id, body, mentionIds, taskIds));
export const useReactMessage = () => useGroupMutation(({ id, mid, reaction }) => g.reactMessage(id, mid, reaction));
export const useDeleteMessage = () => useGroupMutation(({ id, mid }) => g.deleteMessage(id, mid));
export const useCreateAssignment = () => useGroupMutation(({ id, ...body }) => g.createAssignment(id, body), { success: 'Đã giao bài' });
export const useDeleteAssignment = () => useGroupMutation(({ id, aid }) => g.deleteAssignment(id, aid), { success: 'Đã xóa bài giao' });
export const useSetAssignmentDone = () => useGroupMutation(({ id, aid, done }) => g.setAssignmentDone(id, aid, done));

/** Accept or reject an invite from the bell; marks that notification read afterwards. */
export function useRespondInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, accept }) => g.respondInvite(inviteId, accept),
    meta: { success: (_d, v) => (v.accept ? 'Đã tham gia nhóm' : 'Đã từ chối lời mời') },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}