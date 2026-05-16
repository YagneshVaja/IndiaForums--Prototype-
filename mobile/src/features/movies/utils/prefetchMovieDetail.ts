import type { QueryClient } from '@tanstack/react-query';
import {
  fetchMovieCast,
  fetchMovieReviews,
  fetchMovieDiscussionTopics,
  type Movie,
} from '../../../services/api';

// Warm the React-Query cache for the movie detail screen ahead of navigation.
// Critical for Discussion: /search/results cold-starts at ~2s on the backend's
// first call per cycle. Firing it on tile press overlaps that latency with the
// navigation transition + the user's hero-reading time, so by the time the
// Discussion section comes into view (or the tab is tapped) the data is
// usually already in cache.
//
// Use this from EVERY entry point that navigates to 'MovieDetail' — not just
// MoviesScreen. Home's Latest Movies row, News rails, Search results, and
// celebrity filmography all benefit identically.
export function prefetchMovieDetail(queryClient: QueryClient, movie: Movie): void {
  queryClient.prefetchQuery({
    queryKey: ['movie', movie.titleId, 'cast'],
    queryFn:  () => fetchMovieCast(movie.titleId, 1, 12),
    staleTime: 5 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ['movie', movie.titleId, 'reviews'],
    queryFn:  () => fetchMovieReviews(movie.titleId, 5, 5),
    staleTime: 5 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ['movieDiscussion', movie.titleName, 6],
    queryFn:  () => fetchMovieDiscussionTopics(movie.titleName, 6),
    staleTime: 5 * 60 * 1000,
  });
}
