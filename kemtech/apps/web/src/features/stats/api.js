import { api } from '@/shared/api/client.js';

export const fetchStats = () => api('/stats');
export const fetchStatsDay = (day) => api(`/stats/day/${day}`);
export const fetchUserStats = (userId) => api(`/users/${userId}/stats`);
export const fetchUserStatsDay = (userId, day) => api(`/users/${userId}/stats/day/${day}`);
