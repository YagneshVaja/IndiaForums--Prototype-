import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { fetchShorts, type ShortsPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useShorts(parentCategoryId: number | null) {
  return useInfiniteQuery<ShortsPage>({
    queryKey: ['shorts', parentCategoryId ?? 'all'],
    queryFn: ({ pageParam = 1 }) =>
      fetchShorts(pageParam as number, PAGE_SIZE, parentCategoryId),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
