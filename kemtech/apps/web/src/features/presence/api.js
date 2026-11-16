import { api } from '@/shared/api/client.js';

export const fetchOnline = () => api('/presence/online');
