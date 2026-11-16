import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchLesson, saveNote } from '@/features/lessons/api.js';

export const lessonKeys = { detail: (lessonId) => ['lesson', lessonId] };

export const useLessonQuery = (lessonId) =>
  useQuery({ queryKey: lessonKeys.detail(lessonId), queryFn: () => fetchLesson(lessonId) });

/** Saves the lesson note; `options` lets the panel react to success. */
export const useSaveNote = (lessonId, options = {}) =>
  useMutation({ mutationFn: (body) => saveNote(lessonId, body), ...options });
