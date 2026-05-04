import { useQuery } from '@tanstack/react-query';
import {
  fetchMovieDiscussionTopics,
  type MovieDiscussionTopic,
} from '../../../services/api';

/**
 * Discussion topics for a movie come from /search/smart filtered to the
 * Topics section. The public API doesn't expose a movie→forum mapping, but
 * the smart-search endpoint returns forum threads matching the movie title.
 */
export function useMovieDiscussion(movieTitle: string, limit = 6, enabled = true) {
  return useQuery<MovieDiscussionTopic[]>({
    queryKey: ['movieDiscussion', movieTitle, limit],
    queryFn: () => fetchMovieDiscussionTopics(movieTitle, limit),
    // The upstream /search/smart can cold-start at ~12s. Once we've paid
    // that cost we keep the result around aggressively so the user doesn't
    // hit it again navigating back-and-forth.
    staleTime: 10 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: enabled && !!movieTitle,
  });
}
