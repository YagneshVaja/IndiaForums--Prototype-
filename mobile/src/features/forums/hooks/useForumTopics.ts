import { useEffect } from 'react';
import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchForumTopics, type ForumTopicsPage } from '../../../services/api';

export const FORUM_TOPICS_PAGE_SIZE = 20;

export function useForumTopics(forumId: number | null, startPage = 1) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<ForumTopicsPage>({
    queryKey: ['forum-topics', forumId, startPage],
    queryFn: ({ pageParam }) =>
      fetchForumTopics(forumId!, pageParam as number, FORUM_TOPICS_PAGE_SIZE),
    initialPageParam: startPage,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    staleTime: 60 * 1000,
    enabled: typeof forumId === 'number' && Number.isFinite(forumId) && forumId > 0,
    placeholderData: keepPreviousData,
  });

  // Prefetch adjacent pages so Prev/Next taps feel instant.
  useEffect(() => {
    if (!forumId || !query.data) return;
    const current = query.data.pages[0];
    if (!current) return;

    if (current.hasNextPage) {
      const nextPage = current.pageNumber + 1;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['forum-topics', forumId, nextPage],
        queryFn: ({ pageParam }) =>
          fetchForumTopics(forumId, pageParam as number, FORUM_TOPICS_PAGE_SIZE),
        initialPageParam: nextPage,
      });
    }

    if (startPage > 1) {
      const prevPage = startPage - 1;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['forum-topics', forumId, prevPage],
        queryFn: ({ pageParam }) =>
          fetchForumTopics(forumId, pageParam as number, FORUM_TOPICS_PAGE_SIZE),
        initialPageParam: prevPage,
      });
    }
  }, [forumId, startPage, query.data, queryClient]);

  return query;
}
