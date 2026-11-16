import { api } from '@/shared/api/client.js';

export const fetchToday = () => api('/today');
