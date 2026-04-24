import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMyPosts, type MyTopicsPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useMyPosts(enabled: boolean, query: string) {
  return useInfiniteQuery<MyTopicsPage>({
    queryKey: ['my-posts', query.trim()],
    queryFn: ({ pageParam = 1 }) =>
      fetchMyPosts(pageParam as number, PAGE_SIZE, query),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    staleTime: 60 * 1000,
    enabled,
  });
}
