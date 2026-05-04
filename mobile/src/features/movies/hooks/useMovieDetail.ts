import { useQueries } from '@tanstack/react-query';
import {
  fetchMovieCast,
  fetchMovieReviews,
  type MovieCastPage,
  type MovieReviewsPayload,
} from '../../../services/api';

// /story has been returning 500 for every titleId we've tested across many
// sessions. We don't fire it — the synopsis + language fields we need are
// embedded in the /reviews response (`raw.movie.titleShortDesc` etc.) so
// removing the wasted round-trip is a free win.

export interface MovieDetailQueries {
  cast: {
    data: MovieCastPage | null | undefined;
    isLoading: boolean;
    isError: boolean;
  };
  reviews: {
    data: MovieReviewsPayload | null | undefined;
    isLoading: boolean;
    isError: boolean;
  };
}

export function useMovieDetail(titleId: number): MovieDetailQueries {
  const baseOptions = {
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!titleId,
  } as const;
  const results = useQueries({
    queries: [
      {
        ...baseOptions,
        queryKey: ['movie', titleId, 'cast'],
        queryFn: () => fetchMovieCast(titleId, 1, 12),
      },
      {
        ...baseOptions,
        queryKey: ['movie', titleId, 'reviews'],
        queryFn: () => fetchMovieReviews(titleId, 5, 5),
      },
    ],
  });
  const [castQ, reviewsQ] = results;
  return {
    cast:    { data: castQ.data    as MovieCastPage | null | undefined,      isLoading: castQ.isLoading,    isError: castQ.isError },
    reviews: { data: reviewsQ.data as MovieReviewsPayload | null | undefined, isLoading: reviewsQ.isLoading, isError: reviewsQ.isError },
  };
}
