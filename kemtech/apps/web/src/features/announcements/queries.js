import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api.js';

const KEY = ['announcements'];

/** Currently visible announcements (banner, popup, bell badge). Public: works for guests too. */
export const useActiveAnnouncements = () => useQuery({ queryKey: [...KEY, 'active'], queryFn: api.fetchActive, staleTime: 60_000 });

/** Recent announcements including finished ones (the bell list). */
export const useAnnouncementHistory = () => useQuery({ queryKey: [...KEY, 'history'], queryFn: api.fetchHistory, staleTime: 60_000 });

/** Every announcement, for the admin panel. */
export const useAllAnnouncements = () => useQuery({ queryKey: [...KEY, 'all'], queryFn: api.fetchAll });

function useChange(fn, success) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, meta: { success }, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateAnnouncement = () => useChange(api.createAnnouncement, 'Đã đăng thông báo');
export const useUpdateAnnouncement = () => useChange(api.updateAnnouncement, 'Đã cập nhật thông báo');
export const useDeleteAnnouncement = () => useChange(api.deleteAnnouncement, 'Đã xóa thông báo');
