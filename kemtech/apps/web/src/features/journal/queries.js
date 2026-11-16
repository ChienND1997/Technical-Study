import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as j from '@/features/journal/api.js';

export const journalKeys = { notes: ['notes'], quotes: ['quotes'], random: ['quote-random'] };

export const useNotesQuery = () => useQuery({ queryKey: journalKeys.notes, queryFn: j.fetchNotes });
export const useQuotesQuery = () => useQuery({ queryKey: journalKeys.quotes, queryFn: j.fetchQuotes });
/** Random quote for the home hero; cached for the session so it does not change on every render. */
export const useRandomQuote = () => useQuery({ queryKey: journalKeys.random, queryFn: j.fetchRandomQuote, staleTime: Infinity });

/** Helper: a mutation that refreshes the given query keys on success. */
function useRefreshing(fn, keys) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })) });
}

export const useCreateNote = () => useRefreshing(j.createNote, [journalKeys.notes]);
export const useUpdateNote = () => useRefreshing(({ id, ...body }) => j.updateNote(id, body), [journalKeys.notes]);
export const useDeleteNote = () => useRefreshing(j.deleteNote, [journalKeys.notes]);
export const useCreateQuote = () => useRefreshing(j.createQuote, [journalKeys.quotes, journalKeys.random]);
export const useDeleteQuote = () => useRefreshing(j.deleteQuote, [journalKeys.quotes, journalKeys.random]);
