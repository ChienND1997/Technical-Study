import { useQuery } from '@tanstack/react-query';
import { fetchWrongCards } from './api.js';

export const quizKeys = { wrong: ['wrong'] };

export const useWrongCardsQuery = () => useQuery({ queryKey: quizKeys.wrong, queryFn: fetchWrongCards });