import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMyFavouriteForums, type MyForumsPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useMyFavouriteForums(enabled: boolean) {
  return useInfiniteQuery<MyForumsPage>({
    queryKey: ['my-favourite-forums'],
    queryFn: ({ pageParam = 1 }) =>
      fetchMyFavouriteForums(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
