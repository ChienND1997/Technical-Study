import { api } from '@/shared/api/client.js';

export const addToBasket = (body) => api('/cards/basket', { method: 'POST', body });

export const fetchBasket = ({ status = 'all', topic, offset = 0, limit = 30 } = {}) =>
  api(`/basket?status=${status}&offset=${offset}&limit=${limit}${topic ? `&topic=${encodeURIComponent(topic)}` : ''}`);

export const removeFromBasket = (cardIds) => api('/basket/remove', { method: 'POST', body: { cardIds } });

/** Next due cards for the spaced-repetition session: { total, cards }. */
export const fetchReviewQueue = ({ limit = 20, topic } = {}) =>
  api(`/review/queue?limit=${limit}${topic ? `&topic=${encodeURIComponent(topic)}` : ''}`);

/** Grades one card (rating 1..4); the reply says after how many cards an "again" card should return. */
export const answerCard = (body) => api('/review/answer', { method: 'POST', body });
