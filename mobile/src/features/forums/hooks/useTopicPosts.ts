import { useEffect } from 'react';
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

  // Prefetch adjacent pages — primitive deps only.
  const hasNext = query.data?.pages[0]?.hasNextPage ?? false;
  useEffect(() => {
    if (!topicId || searchQuery) return;

    if (hasNext) {
      const nextPage = startPage + 1;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['topic-posts', topicId, searchQuery, nextPage, sort],
        queryFn: ({ pageParam }) =>
          fetchTopicPosts(topicId, pageParam as number, TOPIC_POSTS_PAGE_SIZE, searchQuery, undefined, sort),
        initialPageParam: nextPage,
      });
    }
    if (startPage > 1) {
      const prevPage = startPage - 1;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['topic-posts', topicId, searchQuery, prevPage, sort],
        queryFn: ({ pageParam }) =>
          fetchTopicPosts(topicId, pageParam as number, TOPIC_POSTS_PAGE_SIZE, searchQuery, undefined, sort),
        initialPageParam: prevPage,
      });
    }
  }, [topicId, searchQuery, startPage, sort, hasNext, queryClient]);

  return query;
}
