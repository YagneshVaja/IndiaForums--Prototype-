import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMyWatchedTopics, type MyTopicsPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useMyWatchedTopics(enabled: boolean) {
  return useInfiniteQuery<MyTopicsPage>({
    queryKey: ['my-watched-topics'],
    queryFn: ({ pageParam = 1 }) =>
      fetchMyWatchedTopics(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
