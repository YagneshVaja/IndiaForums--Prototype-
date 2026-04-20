import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchTopicPosts, type TopicPostsPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useTopicPosts(topicId: number | null) {
  return useInfiniteQuery<TopicPostsPage>({
    queryKey: ['topic-posts', topicId],
    queryFn: ({ pageParam = 1 }) =>
      fetchTopicPosts(topicId!, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    staleTime: 60 * 1000,
    enabled: topicId != null,
  });
}
