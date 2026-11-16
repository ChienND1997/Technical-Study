import { useQuery } from '@tanstack/react-query';
import { fetchToday } from '@/features/today/api.js';

export const todayKeys = { all: ['today'] };

/** Also used by the app layout to show the due-cards badge, so both share one cache entry. */
export const useTodayQuery = () => useQuery({ queryKey: todayKeys.all, queryFn: fetchToday });
