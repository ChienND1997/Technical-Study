import { useQuery } from '@tanstack/react-query';
import { fetchSuggestions } from '@/features/practice/api.js';

/** Suggestions are random by nature, so keep them stable for the session unless refetched explicitly. */
export const useSuggestionsQuery = () =>
  useQuery({ queryKey: ['practice', 'suggestions'], queryFn: fetchSuggestions, staleTime: 60_000 });
