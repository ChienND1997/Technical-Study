import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addToBasket, fetchBasket, removeFromBasket } from '@/features/review/api.js';

export const reviewKeys = { all: ['review'] };

/** Adds the cards of a lesson to the review basket, then refreshes everything (counts appear in many places). */
export function useAddToBasket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addToBasket,
    onSuccess: () => qc.invalidateQueries(),
  });
}

const PAGE = 30;

/** Basket cards, loaded page by page for the chosen status/topic. */
export const useBasketQuery = ({ status, topic }) =>
  useInfiniteQuery({
    queryKey: [...reviewKeys.all, 'basket', status, topic ?? ''],
    queryFn: ({ pageParam }) => fetchBasket({ status, topic: topic || undefined, offset: pageParam, limit: PAGE }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.cards.length === PAGE ? pages.length * PAGE : undefined),
  });

export function useRemoveFromBasket() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: removeFromBasket, onSuccess: () => qc.invalidateQueries() });
}

/** Number of basket cards never studied (the nav badge). Uses the same endpoint as the basket page so both always agree. */
export const useUnreadCount = () =>
  useQuery({
    queryKey: [...reviewKeys.all, 'unread'],
    queryFn: () => fetchBasket({ status: 'new', limit: 1 }),
    select: (d) => d.counts.new,
    staleTime: 10_000,
  });
