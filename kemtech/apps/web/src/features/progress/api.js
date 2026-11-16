import { api } from '@/shared/api/client.js';

/** Marks a reading section as done / not done. */
export const completeSection = (id, done) => api(`/sections/${id}/complete`, { method: 'POST', body: { done } });
