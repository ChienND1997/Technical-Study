import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as n from '@/features/notifications/api.js';

export const notifKeys = { list: ['notifications', 'list'], unread: ['notifications', 'unread'] };

/** Unread count for the bell; polled so new comments and mentions show up without a reload. */
export const useUnreadNotifications = () =>
  useQuery({ queryKey: notifKeys.unread, queryFn: n.fetchUnreadCount, refetchInterval: 30000 });
export const useNotificationsQuery = () => useQuery({ queryKey: notifKeys.list, queryFn: n.fetchNotifications });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: n.markRead, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
}

/** Autocomplete for @mentions. */
export const useUserSearch = (q) => useQuery({ queryKey: ['users', 'search', q], queryFn: () => n.searchUsers(q), enabled: q.length > 0, staleTime: 30000 });

function useNotifMutation(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
}
export const useDeleteNotification = () => useNotifMutation(n.deleteNotification);
export const useClearNotifications = () => useNotifMutation(n.clearNotifications);
