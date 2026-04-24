import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { fetchWebStories, type WebStoriesPage } from '../../../services/api';

const PAGE_SIZE = 24;

export function useWebStories() {
  return useInfiniteQuery<WebStoriesPage>({
    queryKey: ['webstories'],
    queryFn: ({ pageParam = 1 }) =>
      fetchWebStories(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage
        ? last.pagination.currentPage + 1
        : undefined,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
