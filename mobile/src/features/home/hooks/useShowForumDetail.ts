import { useQuery } from '@tanstack/react-query';
import { fetchForumTopics, type ForumTopicsPage } from '../../../services/api';

/**
 * Powers the show detail screen. The forum endpoint returns BOTH the rich
 * forumDetail block (description, stats, dateStarted) AND the most recent
 * topics in one call — exactly the data we need for the show page hero +
 * "Latest topics" section.
 *
 * Skips when forumId === 0 (some unranked shows on the channel overview have
 * no forum assigned). Caller should branch on `enabled` and render a stub.
 */
export function useShowForumDetail(forumId: number) {
  return useQuery<ForumTopicsPage>({
    queryKey: ['show-forum-detail', forumId],
    queryFn: () => fetchForumTopics(forumId, 1, 5),
    enabled: forumId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
