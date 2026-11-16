import { useQuery } from '@tanstack/react-query';
import { fetchMockHistory } from '@/features/mock/api.js';

export const mockKeys = { history: ['mock-history'] };

export const useMockHistoryQuery = () => useQuery({ queryKey: mockKeys.history, queryFn: fetchMockHistory });
