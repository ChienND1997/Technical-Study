import { api } from '@/shared/api/client.js';

export const fetchNotifications = () => api('/notifications');
export const fetchUnreadCount = () => api('/notifications/unread-count');
export const markRead = (ids) => api('/notifications/read', { method: 'POST', body: ids ? { ids } : {} });
export const searchUsers = (q) => api(`/users/search?q=${encodeURIComponent(q)}`);
export const deleteNotification = (id) => api(`/notifications/${id}`, { method: 'DELETE' });
export const clearNotifications = () => api('/notifications', { method: 'DELETE' });
