import { useQuery } from '@tanstack/react-query';
import { searchLessons } from '@/features/search/api.js';

export const searchKeys = { query: (q) => ['search', q] };

/** Disabled until the query has at least 2 characters (the API requires it). */
export const useSearchQuery = (q) =>
  useQuery({
    queryKey: searchKeys.query(q),
    queryFn: () => searchLessons(q),
    enabled: !!q && q.length >= 2,
  });
