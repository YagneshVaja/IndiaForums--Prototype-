import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchArticleList, fetchVideos, fetchMediaGalleries } from '../../../services/api';

const PAGE_SIZE = 25;

// NewsScreen fetches from /articles/list (which returns defaultCategoryId as
// `catId`) and filters client-side by category/subcategory. The query is cat-
// agnostic so React Query caches one list regardless of which chip is active.
export function useNewsArticles() {
  return useInfiniteQuery({
    queryKey: ['articles', 'news', 'list'],
    queryFn: ({ pageParam }) =>
      fetchArticleList({ page: pageParam as number, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return (lastPageParam as number) + 1;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
}

export function useNewsVideos() {
  return useQuery({
    queryKey: ['news', 'inline-videos'],
    queryFn: () => fetchVideos(1, 12),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.videos ?? [],
  });
}

export function useNewsGalleries() {
  return useQuery({
    queryKey: ['news', 'inline-galleries'],
    queryFn: () => fetchMediaGalleries(1, 12),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.galleries ?? [],
  });
}
