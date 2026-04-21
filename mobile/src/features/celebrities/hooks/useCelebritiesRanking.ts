import { useQuery } from '@tanstack/react-query';
import { fetchCelebrities } from '../../../services/api';

export function useCelebritiesRanking() {
  return useQuery({
    queryKey: ['celebrities', 'ranking'],
    queryFn: () => fetchCelebrities(1, 20),
    staleTime: 10 * 60 * 1000,
  });
}
