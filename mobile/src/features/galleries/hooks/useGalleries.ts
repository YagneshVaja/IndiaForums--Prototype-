import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMediaGalleries, type GalleriesPage } from '../../../services/api';

const PAGE_SIZE = 25;

export function useGalleries(categoryId: number | null) {
  return useInfiniteQuery<GalleriesPage>({
    queryKey: ['galleries', categoryId ?? 'all'],
    queryFn: ({ pageParam = 1 }) =>
      fetchMediaGalleries(pageParam as number, PAGE_SIZE, categoryId),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}
