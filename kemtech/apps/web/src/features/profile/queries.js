import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/queries.js';
import { changePassword, fetchProfile, fetchPublicProfile, saveGoal, saveName } from '@/features/profile/api.js';

export const profileKeys = { all: ['profile'], public: (id) => ['profile', 'public', id] };

export const useProfileQuery = () => useQuery({ queryKey: profileKeys.all, queryFn: fetchProfile });

/** Someone else's read-only profile (name, level/XP, streak, badges — no email, no private goal). */
export const usePublicProfileQuery = (id) => useQuery({ queryKey: profileKeys.public(id), queryFn: () => fetchPublicProfile(id), enabled: !!id });

/** Changing the goal reshapes today's study list, so refresh everything. */
export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: saveGoal, meta: { success: 'Đã lưu mục tiêu học' }, onSuccess: () => qc.invalidateQueries() });
}

export const useChangePassword = () => useMutation({ mutationFn: changePassword, meta: { success: 'Đã đổi mật khẩu' } });

export function useSaveName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveName, meta: { success: 'Đã lưu tên' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.all });
      qc.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
