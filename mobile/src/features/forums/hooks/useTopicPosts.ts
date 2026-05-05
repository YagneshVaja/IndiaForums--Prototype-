import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchTopicPosts, type TopicPostsPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useTopicPosts(topicId: number | null, searchQuery = '') {
  return useInfiniteQuery<TopicPostsPage>({
    queryKey: ['topic-posts', topicId, searchQuery],
    queryFn: ({ pageParam = 1, signal }) =>
      fetchTopicPosts(topicId!, pageParam as number, PAGE_SIZE, searchQuery, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    staleTime: 60 * 1000,
    enabled: typeof topicId === 'number' && Number.isFinite(topicId) && topicId > 0,
  });
}
