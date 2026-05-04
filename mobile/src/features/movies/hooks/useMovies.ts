import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { fetchMovies, type MoviesPage, type MovieMode } from '../../../services/api';

// 12 fits roughly 6 grid rows on a phone — enough to fill above-the-fold and
// slightly below. The next page loads on scroll. Halving the initial fetch
// (vs 24) cuts both the API payload and the parallel CDN poster burst.
const PAGE_SIZE = 12;

export function useMovies(mode: MovieMode) {
  return useInfiniteQuery<MoviesPage>({
    queryKey: ['movies', mode],
    queryFn: ({ pageParam = 1 }) => fetchMovies(mode, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
