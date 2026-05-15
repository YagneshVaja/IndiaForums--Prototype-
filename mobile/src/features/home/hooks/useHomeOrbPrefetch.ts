import { useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  fetchCelebrities,
  fetchMovies,
  fetchVideos,
  fetchMediaGalleries,
  fetchShorts,
  fetchQuizzes,
  fetchWebStories,
  fetchFanFictions,
} from '../../../services/api';

// Prefetchers mirror the query keys, fetchers, and staleTimes used by each
// destination screen's hook (useCelebritiesRanking, useMovies('latest'),
// useVideos(null), useGalleries(null)). React Query dedupes by key, so a
// warm cache turns the destination's useQuery/useInfiniteQuery into an
// instant cache hit — the screen renders without a network round-trip.
export type OrbDestination =
  | 'Celebrities'
  | 'Movies'
  | 'Videos'
  | 'Galleries'
  | 'Shorts'
  | 'Quizzes'
  | 'Web Stories'
  | 'Fan Fictions';

// Order matters for the idle pass: most-tapped destinations warm first so
// they win the network if the chain is interrupted (user backgrounds the
// app or taps before the chain completes).
const PREFETCHERS: Record<OrbDestination, (qc: QueryClient) => Promise<unknown>> = {
  Celebrities: (qc) =>
    qc.prefetchQuery({
      queryKey: ['celebrities', 'ranking'],
      queryFn: () => fetchCelebrities(1, 20),
      staleTime: 10 * 60 * 1000,
    }),
  Movies: (qc) =>
    qc.prefetchInfiniteQuery({
      queryKey: ['movies', 'latest'],
      queryFn: ({ pageParam = 1 }) => fetchMovies('latest', pageParam as number, 12),
      initialPageParam: 1,
      staleTime: 2 * 60 * 1000,
    }),
  Videos: (qc) =>
    qc.prefetchInfiniteQuery({
      queryKey: ['videos', 'all'],
      queryFn: ({ pageParam = 1 }) => fetchVideos(pageParam as number, 20, null),
      initialPageParam: 1,
      staleTime: 2 * 60 * 1000,
    }),
  Galleries: (qc) =>
    qc.prefetchInfiniteQuery({
      queryKey: ['galleries', 'all'],
      queryFn: ({ pageParam = 1 }) => fetchMediaGalleries(pageParam as number, 25, null),
      initialPageParam: 1,
      staleTime: 2 * 60 * 1000,
    }),
  Quizzes: (qc) =>
    qc.prefetchInfiniteQuery({
      queryKey: ['quizzes', 'list'],
      queryFn: ({ pageParam = 1 }) => fetchQuizzes(pageParam as number, 25),
      initialPageParam: 1,
      staleTime: 2 * 60 * 1000,
    }),
  'Web Stories': (qc) =>
    qc.prefetchInfiniteQuery({
      queryKey: ['webstories'],
      queryFn: ({ pageParam = 1 }) => fetchWebStories(pageParam as number, 24),
      initialPageParam: 1,
      staleTime: 5 * 60 * 1000,
    }),
  'Fan Fictions': (qc) =>
    qc.prefetchInfiniteQuery({
      queryKey: ['fan-fictions', 'list'],
      queryFn: ({ pageParam = 1 }) => fetchFanFictions(pageParam as number, 20),
      initialPageParam: 1,
      staleTime: 2 * 60 * 1000,
    }),
  Shorts: (qc) =>
    qc.prefetchInfiniteQuery({
      queryKey: ['shorts', 'all'],
      queryFn: ({ pageParam = 1 }) => fetchShorts(pageParam as number, 20, null),
      initialPageParam: 1,
      staleTime: 2 * 60 * 1000,
    }),
};

// Two-layer perceived-latency strategy for the home orbs:
//   1. **Idle prefetch** — once Home has settled (post-interactions), quietly
//      warm all four destinations in series so we don't burst four parallel
//      requests on poor connections. Staggering also yields to the home
//      screen's own image/network traffic.
//   2. **Press-in prefetch** — `prefetch(orb)` fires from `onPressIn` on
//      each orb. If the idle pass already covered it, React Query no-ops
//      (staleTime); if not, we steal the ~100–300ms between finger contact
//      and finger release for the request.
export function useHomeOrbPrefetch() {
  const qc = useQueryClient();

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      (Object.keys(PREFETCHERS) as OrbDestination[]).reduce<Promise<unknown>>(
        (chain, orb) => chain.then(() => PREFETCHERS[orb](qc).catch(() => undefined)),
        Promise.resolve(undefined),
      );
    });
    return () => handle.cancel();
  }, [qc]);

  const prefetch = useCallback(
    (orb: OrbDestination) => {
      PREFETCHERS[orb]?.(qc).catch(() => undefined);
    },
    [qc],
  );

  return { prefetch };
}
