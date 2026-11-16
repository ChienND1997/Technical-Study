import { useQuery } from '@tanstack/react-query';
import { fetchGame } from '@/features/game/api.js';

export const gameKeys = { all: ['game'] };

/** Level, XP progress and badges. Refetching it is also what awards new badges. */
export const useGameQuery = () => useQuery({ queryKey: gameKeys.all, queryFn: fetchGame, staleTime: 5_000 });
