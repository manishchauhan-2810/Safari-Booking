import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export const useQuote = (data, enabled) => {
  return useQuery({
    queryKey: ['quote', data],
    queryFn: () => api.post('/public/pricing/quote', data),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
};