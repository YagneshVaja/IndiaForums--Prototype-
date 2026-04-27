import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  fetchArticleList,
  fetchArticles,
  fetchVideos,
  fetchMediaGalleries,
} from '../../../services/api';

const PAGE_SIZE = 25;

// NewsScreen needs two fetch modes:
//   • parent-only filter (TV / MOVIES / DIGITAL / LIFESTYLE / SPORTS, sub=ALL)
//     → /home/articles?articleType=X filters server-side, so rare categories
//       like SPORTS aren't drowned out by TV/MOVIES on /articles/list page 1.
//   • sub-cat filter (HINDI / ENGLISH / TAMIL / …) or top-level ALL
//     → /articles/list is the only endpoint that returns defaultCategoryId,
//       which is what we need to filter by sub-cat client-side.
export function useNewsArticles(parentCategory: string, hasSubCatFilter: boolean) {
  const useHomeApi = parentCategory !== 'all' && !hasSubCatFilter;

  return useInfiniteQuery({
    queryKey: useHomeApi
      ? (['articles', 'news', 'by-cat', parentCategory] as const)
      : (['articles', 'news', 'list'] as const),
    queryFn: ({ pageParam }) =>
      useHomeApi
        ? fetchArticles({
            category: parentCategory,
            page: pageParam as number,
            limit: PAGE_SIZE,
          })
        : fetchArticleList({ page: pageParam as number, limit: PAGE_SIZE }),
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
