import { useCallback, useEffect } from 'react';
import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTopicPosts, type TopicPostsPage } from '../../../services/api';

export const TOPIC_POSTS_PAGE_SIZE = 20;

export type TopicPostsSort = 'date' | 'likes';

export function useTopicPosts(
  topicId: number | null,
  searchQuery = '',
  startPage = 1,
  sort: TopicPostsSort = 'date',
) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<TopicPostsPage>({
    queryKey: ['topic-posts', topicId, searchQuery, startPage, sort],
    queryFn: ({ pageParam, signal }) =>
      fetchTopicPosts(topicId!, pageParam as number, TOPIC_POSTS_PAGE_SIZE, searchQuery, signal, sort),
    initialPageParam: startPage,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    staleTime: 60 * 1000,
    enabled: typeof topicId === 'number' && Number.isFinite(topicId) && topicId > 0,
    placeholderData: keepPreviousData,
  });

  // Imperative prefetch for pagination UI (scrubber drag, Prev/Next press-in,
  // jump-input drafts). React Query dedupes by queryKey, so a burst of calls
  // during a drag collapses into a single in-flight request.
  const prefetchPage = useCallback(
    (page: number) => {
      if (!topicId || searchQuery) return;
      if (!Number.isFinite(page) || page < 1) return;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['topic-posts', topicId, searchQuery, page, sort],
        queryFn: ({ pageParam }) =>
          fetchTopicPosts(topicId, pageParam as number, TOPIC_POSTS_PAGE_SIZE, searchQuery, undefined, sort),
        initialPageParam: page,
        staleTime: 60 * 1000,
      });
    },
    [topicId, searchQuery, sort, queryClient],
  );

  // Auto-prefetch a small ±2 window so chained Prev/Next stays instant.
  const hasNext = query.data?.pages[0]?.hasNextPage ?? false;
  useEffect(() => {
    if (!topicId || searchQuery) return;
    for (let d = 1; d <= 2; d++) {
      if (hasNext) prefetchPage(startPage + d);
      if (startPage - d >= 1) prefetchPage(startPage - d);
    }
  }, [topicId, searchQuery, startPage, sort, hasNext, prefetchPage]);

  return { ...query, prefetchPage };
}
