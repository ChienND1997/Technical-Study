import { useQuery } from '@tanstack/react-query';
import { fetchStats, fetchStatsDay, fetchUserStats, fetchUserStatsDay } from '@/features/stats/api.js';

export const statsKeys = {
  all: ['stats'],
  day: (d) => ['stats', 'day', d],
  user: (id) => ['stats', 'user', id],
  userDay: (id, d) => ['stats', 'user', id, 'day', d],
};

/** Same payload as the caller's own stats; pass `userId` to view someone else's (read-only, public). */
export const useStatsQuery = (userId) =>
  useQuery({ queryKey: userId ? statsKeys.user(userId) : statsKeys.all, queryFn: () => (userId ? fetchUserStats(userId) : fetchStats()) });

export const useStatsDayQuery = (day, userId) =>
  useQuery({
    queryKey: userId ? statsKeys.userDay(userId, day) : statsKeys.day(day),
    queryFn: () => (userId ? fetchUserStatsDay(userId, day) : fetchStatsDay(day)),
    enabled: !!day,
  });
