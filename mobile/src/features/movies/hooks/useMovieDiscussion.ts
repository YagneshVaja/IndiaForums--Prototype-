import { useQuery } from '@tanstack/react-query';
import {
  fetchMovieDiscussionTopics,
  type MovieDiscussionTopic,
} from '../../../services/api';
import {
  loadDiscussionFromCache,
  saveDiscussionToCache,
} from '../data/discussionCache';

// Discussion topics for a movie. Layered for speed:
//  - MMKV placeholder: if we've ever seen this movie's topics on this device,
//    render them instantly (no spinner) while the network revalidates in the
//    background. Survives app restarts.
//  - react-query memory cache: keeps results for 30 min so in-session navs
//    are free.
//  - Endpoint: /search/results?entityType=Topic — chosen over /search/smart
//    because it cold-starts at ~2s vs ~12s; warm calls are identical (~50ms).
export function useMovieDiscussion(movieTitle: string, limit = 6, enabled = true) {
  return useQuery<MovieDiscussionTopic[]>({
    queryKey: ['movieDiscussion', movieTitle, limit],
    queryFn: async () => {
      const topics = await fetchMovieDiscussionTopics(movieTitle, limit);
      saveDiscussionToCache(movieTitle, topics);
      return topics;
    },
    placeholderData: () => loadDiscussionFromCache(movieTitle),
    staleTime: 10 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: enabled && !!movieTitle,
  });
}
