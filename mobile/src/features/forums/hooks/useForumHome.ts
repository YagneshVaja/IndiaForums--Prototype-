import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { fetchForumHome, type ForumsHomePage } from '../../../services/api';

export const FORUM_HOME_PAGE_SIZE = 20;

export function useForumHome(categoryId: number | null) {
  return useInfiniteQuery<ForumsHomePage>({
    queryKey: ['forums-home', categoryId ?? 'all'],
    queryFn: ({ pageParam }) =>
      fetchForumHome(categoryId, pageParam as number, FORUM_HOME_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
