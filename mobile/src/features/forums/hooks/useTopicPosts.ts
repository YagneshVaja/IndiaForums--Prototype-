import { useEffect } from 'react';
import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTopicPosts, type TopicPostsPage } from '../../../services/api';

export const TOPIC_POSTS_PAGE_SIZE = 20;

export function useTopicPosts(
  topicId: number | null,
  searchQuery = '',
  startPage = 1,
) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<TopicPostsPage>({
    queryKey: ['topic-posts', topicId, searchQuery, startPage],
    queryFn: ({ pageParam, signal }) =>
      fetchTopicPosts(topicId!, pageParam as number, TOPIC_POSTS_PAGE_SIZE, searchQuery, signal),
    initialPageParam: startPage,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    staleTime: 60 * 1000,
    enabled: typeof topicId === 'number' && Number.isFinite(topicId) && topicId > 0,
    placeholderData: keepPreviousData,
  });

  // Prefetch adjacent pages — primitive deps only.
  const hasNext = query.data?.pages[0]?.hasNextPage ?? false;
  useEffect(() => {
    if (!topicId || searchQuery) return;

    if (hasNext) {
      const nextPage = startPage + 1;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['topic-posts', topicId, searchQuery, nextPage],
        queryFn: ({ pageParam }) =>
          fetchTopicPosts(topicId, pageParam as number, TOPIC_POSTS_PAGE_SIZE, searchQuery),
        initialPageParam: nextPage,
      });
    }
    if (startPage > 1) {
      const prevPage = startPage - 1;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['topic-posts', topicId, searchQuery, prevPage],
        queryFn: ({ pageParam }) =>
          fetchTopicPosts(topicId, pageParam as number, TOPIC_POSTS_PAGE_SIZE, searchQuery),
        initialPageParam: prevPage,
      });
    }
  }, [topicId, searchQuery, startPage, hasNext, queryClient]);

  return query;
}
