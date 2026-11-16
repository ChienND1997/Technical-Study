import { api } from '@/shared/api/client.js';

export const fetchMockHistory = () => api('/mock/history');
/** @param {URLSearchParams} params n, optional topic and level */
export const startMock = (params) => api(`/mock/start?${params}`);
export const finishMock = (body) => api('/mock/finish', { method: 'POST', body });