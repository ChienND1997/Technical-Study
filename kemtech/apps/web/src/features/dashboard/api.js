import { api } from '@/shared/api/client.js';

export const fetchDashboard = () => api('/dashboard');

export const generatePlan = () => api('/plan/generate', { method: 'POST', body: {} });
