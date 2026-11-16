import { api } from '@/shared/api/client.js';

/** @param {URLSearchParams} params n, optional topic and level */
export const fetchQuiz = (params) => api(`/quiz?${params}`);
export const answerQuiz = (body) => api('/quiz/answer', { method: 'POST', body });
export const fetchWrongCards = () => api('/quiz/wrong');
