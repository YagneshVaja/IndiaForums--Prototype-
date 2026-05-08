import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchCelebrityFilmography } from '../../../services/api';
import type { MoviesPage } from '../../../services/api';

export function useCelebrityFilmography(personId: string) {
  return useInfiniteQuery<MoviesPage>({
    queryKey: ['celebrity', personId, 'filmography'],
    queryFn: ({ pageParam }) =>
      fetchCelebrityFilmography(personId, (pageParam as number) ?? 1, 24),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    enabled: !!personId,
    staleTime: 10 * 60 * 1000,
  });
}
