import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchForumTopics, type ForumTopicsPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useForumTopics(forumId: number | null) {
  return useInfiniteQuery<ForumTopicsPage>({
    queryKey: ['forum-topics', forumId],
    queryFn: ({ pageParam = 1 }) =>
      fetchForumTopics(forumId!, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    staleTime: 60 * 1000,
    enabled: forumId != null,
  });
}
