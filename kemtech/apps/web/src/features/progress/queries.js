import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeSection } from '@/features/progress/api.js';

/**
 * Marks a section done / not done, then refreshes everything. The app is small, so a global
 * invalidation is simpler than tracking which screens (today, track days, lesson) show the section.
 */
export function useCompleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }) => completeSection(id, done),
    onSuccess: () => qc.invalidateQueries(),
    // e.g. "finish the earlier sessions first": the checkbox simply stays as it was
    onError: (e) => window.alert(e.message),
  });
}
