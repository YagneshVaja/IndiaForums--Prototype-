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

  // Prefetch adjacent pages so Prev/Next render instantly. Deps are
  // primitives only — `query.data` reference changes per fetch state and
  // would re-fire this effect dozens of times per page transition.
  const hasNext = query.data?.pages[0]?.hasNextPage ?? false;
  useEffect(() => {
    if (!forumId) return;

    if (hasNext) {
      const nextPage = startPage + 1;
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
  }, [forumId, startPage, hasNext, queryClient]);

  return query;
}
