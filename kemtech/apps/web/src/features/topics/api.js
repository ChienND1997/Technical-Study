import { api } from '@/shared/api/client.js';

export const fetchTopics = () => api('/topics');
export const fetchTopic = (slug) => api(`/topics/${slug}`);
