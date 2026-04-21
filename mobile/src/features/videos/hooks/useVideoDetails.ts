import { useQuery } from '@tanstack/react-query';
import { fetchVideoDetails } from '../../../services/api';

export function useVideoDetails(id: string) {
  return useQuery({
    queryKey: ['videoDetails', id],
    queryFn: () => fetchVideoDetails(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
