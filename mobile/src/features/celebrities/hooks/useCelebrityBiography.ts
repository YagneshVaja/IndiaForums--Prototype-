import { useQuery } from '@tanstack/react-query';
import { fetchCelebrityBiography } from '../../../services/api';

export function useCelebrityBiography(personId: string) {
  return useQuery({
    queryKey: ['celebrity', personId, 'biography'],
    queryFn: () => fetchCelebrityBiography(personId),
    enabled: !!personId,
    staleTime: 15 * 60 * 1000,
  });
}
