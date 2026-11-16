import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDashboard, generatePlan } from '@/features/dashboard/api.js';

export const dashboardKeys = { all: ['dashboard'] };

export const useDashboardQuery = () => useQuery({ queryKey: dashboardKeys.all, queryFn: fetchDashboard, staleTime: 5_000 });

/** Builds today's random study list; refresh everything that depends on it afterwards. */
export function useGeneratePlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: generatePlan, meta: { success: 'Đã tạo danh sách học hôm nay' }, onSuccess: () => qc.invalidateQueries() });
}
