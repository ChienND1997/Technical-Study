import { api } from '@/shared/api/client.js';

export const fetchLesson = (lessonId) => api(`/lessons/${lessonId}`);

/** Saves the user's note for a lesson (an empty text clears it). */
export const saveNote = (lessonId, body) => api(`/notes/${lessonId}`, { method: 'PUT', body: { body } });
