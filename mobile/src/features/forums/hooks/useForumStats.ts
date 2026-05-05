import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../services/api';

export interface ForumStats {
  rank: number;
  prevRank: number;
  followCount: number;
}

/**
 * Lazy-fetch enriched stats (rank, follower count) for a single forum.
 *
 * Background: `/forums/home` only returns name/topic-count and zeros for
 * `currentRank` and `followCount`. The per-forum endpoint returns the full
 * `forumDetail` with real numbers, so we make a lightweight call (pageSize=1)
 * and cache the result for 5 minutes.
 */
export function useForumStats(forumId: number, enabled = true) {
  return useQuery<ForumStats>({
    queryKey: ['forum-stats', forumId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/forums/${forumId}/topics`, {
        params: { pageNumber: 1, pageSize: 1 },
      });
      const detail = data?.forumDetail || {};
      return {
        rank:        Number(detail.currentRank ?? 0),
        prevRank:    Number(detail.previousRank ?? 0),
        followCount: Number(detail.followCount ?? 0),
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: enabled && forumId > 0,
  });
}
