import { api } from '@/shared/api/client.js';

export const fetchNotes = () => api('/notes');
export const createNote = (body) => api('/notes', { method: 'POST', body });
export const updateNote = (id, body) => api(`/notes/${id}`, { method: 'PUT', body });
export const deleteNote = (id) => api(`/notes/${id}`, { method: 'DELETE' });
export const fetchQuotes = () => api('/quotes');
export const fetchRandomQuote = () => api('/quotes/random');
export const createQuote = (body) => api('/quotes', { method: 'POST', body });
export const deleteQuote = (id) => api(`/quotes/${id}`, { method: 'DELETE' });
