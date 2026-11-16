import { api } from '@/shared/api/client.js';

export const fetchUsers = () => api('/admin/users');
export const createUser = (body) => api('/admin/users', { method: 'POST', body });
export const setRole = (id, role) => api(`/admin/users/${id}/role`, { method: 'PUT', body: { role } });
export const setActive = (id, active) => api(`/admin/users/${id}/active`, { method: 'PUT', body: { active } });
export const softDelete = (id) => api(`/admin/users/${id}`, { method: 'DELETE' });
export const restoreUser = (id) => api(`/admin/users/${id}/restore`, { method: 'POST', body: {} });
export const runIngest = () => api('/admin/ingest', { method: 'POST', body: {} });
export const resetPassword = (id, password) => api(`/admin/users/${id}/password`, { method: 'PUT', body: { password } });
