import { api } from '@/shared/api/client.js';

export const searchLessons = (q) => api(`/search?q=${encodeURIComponent(q)}`);
