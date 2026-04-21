import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchCelebrityFans } from '../../../services/api';
import type { CelebrityFansPayload } from '../../../services/api';

export function useCelebrityFans(personId: string) {
  return useInfiniteQuery<CelebrityFansPayload>({
    queryKey: ['celebrity', personId, 'fans'],
    queryFn: ({ pageParam }) => fetchCelebrityFans(personId, (pageParam as number) ?? 1, 20),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  });
}
