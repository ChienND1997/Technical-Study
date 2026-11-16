import { api } from '@/shared/api/client.js';

/** Resolves a docs path to an in-app route, e.g. { to: '/lessons/12' }. */
export const resolveLink = (p) => api(`/resolve?p=${encodeURIComponent(p)}`);
