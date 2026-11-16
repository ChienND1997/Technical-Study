import { api } from '@/shared/api/client.js';

export const fetchProfile = () => api('/profile');
export const fetchPublicProfile = (id) => api(`/users/${id}/profile`);
export const saveName = (name) => api('/profile', { method: 'PUT', body: { name } });
export const saveGoal = (goal) => api('/profile/goal', { method: 'PUT', body: goal });
export const changePassword = (body) => api('/profile/password', { method: 'PUT', body });
