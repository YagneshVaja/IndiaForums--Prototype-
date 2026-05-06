import { useEffect } from 'react';
import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchForumHome, type ForumsHomePage } from '../../../services/api';

export const FORUM_HOME_PAGE_SIZE = 20;

export function useForumHome(categoryId: number | null, startPage = 1) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<ForumsHomePage>({
    queryKey: ['forums-home', categoryId ?? 'all', startPage],
    queryFn: ({ pageParam }) =>
      fetchForumHome(categoryId, pageParam as number, FORUM_HOME_PAGE_SIZE),
    initialPageParam: startPage,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Prefetch adjacent pages for instant Prev/Next.
  useEffect(() => {
    const current = query.data?.pages[0];
    if (!current) return;
    const key = categoryId ?? 'all';

    if (current.pageNumber < current.totalPages) {
      const nextPage = current.pageNumber + 1;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['forums-home', key, nextPage],
        queryFn: ({ pageParam }) =>
          fetchForumHome(categoryId, pageParam as number, FORUM_HOME_PAGE_SIZE),
        initialPageParam: nextPage,
      });
    }
    if (startPage > 1) {
      const prevPage = startPage - 1;
      queryClient.prefetchInfiniteQuery({
        queryKey: ['forums-home', key, prevPage],
        queryFn: ({ pageParam }) =>
          fetchForumHome(categoryId, pageParam as number, FORUM_HOME_PAGE_SIZE),
        initialPageParam: prevPage,
      });
    }
  }, [categoryId, startPage, query.data, queryClient]);

  return query;
}
