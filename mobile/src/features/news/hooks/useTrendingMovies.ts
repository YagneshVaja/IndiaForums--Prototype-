import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { fetchMovies, type MoviesPage } from '../../../services/api';

// Page size deliberately small: each News-feed movies rail consumes 4, so a
// 12-per-page batch covers ~3 rails before we hit the next page.
const PAGE_SIZE = 12;

// 'latest' is the closest analogue to "trending" exposed by the movies API
// today. Infinite query so the News tab can keep injecting fresh movie rails
// as the user scrolls deep — no recycled posters.
export function useTrendingMovies() {
  return useInfiniteQuery<
    MoviesPage,
    Error,
    InfiniteData<MoviesPage>,
    readonly ['movies', 'trending', 'news-feed'],
    number
  >({
    queryKey: ['movies', 'trending', 'news-feed'] as const,
    queryFn: ({ pageParam }) => fetchMovies('latest', pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage) =>
      lastPage.pageNumber < lastPage.totalPages ? lastPage.pageNumber + 1 : undefined,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}
