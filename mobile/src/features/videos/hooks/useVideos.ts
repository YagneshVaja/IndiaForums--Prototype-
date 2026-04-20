import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { fetchVideos, type VideosPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useVideos(contentId: number | null) {
  return useInfiniteQuery<VideosPage>({
    queryKey: ['videos', contentId ?? 'all'],
    queryFn: ({ pageParam = 1 }) => fetchVideos(pageParam as number, PAGE_SIZE, contentId),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
