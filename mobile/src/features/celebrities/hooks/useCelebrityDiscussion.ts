import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchForumTopics } from '../../../services/api';
import type { ForumTopicsPage } from '../../../services/api';

export function useCelebrityDiscussion(forumId: number | null) {
  return useInfiniteQuery<ForumTopicsPage>({
    queryKey: ['celebrity', 'discussion', forumId ?? 0],
    queryFn: ({ pageParam }) =>
      fetchForumTopics(forumId ?? 0, (pageParam as number) ?? 1, 20),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    enabled: !!forumId && forumId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
