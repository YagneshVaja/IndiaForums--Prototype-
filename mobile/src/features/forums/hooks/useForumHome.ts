import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchForumHome, type ForumsHomePage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useForumHome(categoryId: number | null) {
  return useInfiniteQuery<ForumsHomePage>({
    queryKey: ['forums-home', categoryId ?? 'all'],
    queryFn: ({ pageParam = 1 }) =>
      fetchForumHome(categoryId, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}
