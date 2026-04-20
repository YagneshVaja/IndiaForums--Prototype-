import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchAllForumTopics, type AllTopicsPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useAllForumTopics() {
  return useInfiniteQuery<AllTopicsPage>({
    queryKey: ['forums-all-topics'],
    queryFn: ({ pageParam = 1 }) =>
      fetchAllForumTopics(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}
