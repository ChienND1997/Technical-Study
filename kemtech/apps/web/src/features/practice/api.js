import { api } from '@/shared/api/client.js';

export const fetchSuggestions = () => api('/practice/suggestions');
