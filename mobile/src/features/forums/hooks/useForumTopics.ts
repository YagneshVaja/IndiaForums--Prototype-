import { useCallback, useEffect } from 'react';
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

  // Imperative prefetch — exposed so UI affordances (scrubber drag, Prev/Next
  // press-in, jump-input drafts) can warm a target page *before* the user
  // commits. React Query dedupes by queryKey, so repeated calls during a
  // drag/typing burst collapse into a single in-flight request.
  const prefetchPage = useCallback(
    (page: number) => {
      if (!forumId || !Number.isFinite(page) || page < 1) return;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['forum-topics', forumId, page],
        queryFn: ({ pageParam }) =>
          fetchForumTopics(forumId, pageParam as number, FORUM_TOPICS_PAGE_SIZE),
        initialPageParam: page,
        staleTime: 60 * 1000,
      });
    },
    [forumId, queryClient],
  );

  // Auto-prefetch a small window (±2) around the current page so chained
  // Prev/Next stays instant. Larger windows aren't worth the request churn —
  // arbitrary jumps come in via `prefetchPage` from the pagination UI.
  const hasNext = query.data?.pages[0]?.hasNextPage ?? false;
  useEffect(() => {
    if (!forumId) return;
    for (let d = 1; d <= 2; d++) {
      if (hasNext) prefetchPage(startPage + d);
      if (startPage - d >= 1) prefetchPage(startPage - d);
    }
  }, [forumId, startPage, hasNext, prefetchPage]);

  return { ...query, prefetchPage };
}
