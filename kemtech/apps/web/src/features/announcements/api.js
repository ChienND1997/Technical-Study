import { api } from '@/shared/api/client.js';

export const fetchActive = () => api('/public/announcements');
export const fetchHistory = () => api('/public/announcements/history');
export const fetchAll = () => api('/admin/announcements');
export const createAnnouncement = (body) => api('/admin/announcements', { method: 'POST', body });
export const updateAnnouncement = ({ id, ...body }) => api(`/admin/announcements/${id}`, { method: 'PUT', body });
export const deleteAnnouncement = (id) => api(`/admin/announcements/${id}`, { method: 'DELETE' });
