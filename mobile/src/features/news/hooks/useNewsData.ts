import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import {
  fetchArticleList,
  fetchArticles,
  fetchVideos,
  fetchMediaGalleries,
  type GalleriesPage,
  type VideosPage,
} from '../../../services/api';

const PAGE_SIZE = 25;
const MEDIA_PAGE_SIZE = 12;

// Hard safety cap so a misbehaving backend (page that always returns 1 item
// with hasNextPage perpetually true) can't make us paginate forever. 60 pages
// at PAGE_SIZE 25 = up to 1500 articles, more than anyone scrolls in a
// session.
const MAX_ARTICLE_PAGES = 60;

// NewsScreen needs two article fetch modes:
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
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      // Stop only when the API truly returns 0 articles. The previous
      // `< PAGE_SIZE` check stopped one page too early whenever the backend
      // returned a partial page (e.g. 24 of 25), which manifests as the news
      // feed appearing to "stick" at the visible end of page 1.
      if (lastPage.length === 0) return undefined;
      if (allPages.length >= MAX_ARTICLE_PAGES) return undefined;
      return (lastPageParam as number) + 1;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
}

// Videos / galleries are now paginated. The News feed consumes them in slices
// of RAIL_SLICE (4) per injection; a 12-per-page batch covers ~3 rails of the
// same type, after which we fetch the next page. `hasNextPage` from the
// pagination payload is the authoritative end-of-stream signal.
export function useNewsVideos() {
  return useInfiniteQuery<
    VideosPage,
    Error,
    InfiniteData<VideosPage>,
    readonly ['news', 'inline-videos'],
    number
  >({
    queryKey: ['news', 'inline-videos'] as const,
    queryFn: ({ pageParam }) => fetchVideos(pageParam, MEDIA_PAGE_SIZE),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNewsGalleries() {
  return useInfiniteQuery<
    GalleriesPage,
    Error,
    InfiniteData<GalleriesPage>,
    readonly ['news', 'inline-galleries'],
    number
  >({
    queryKey: ['news', 'inline-galleries'] as const,
    queryFn: ({ pageParam }) => fetchMediaGalleries(pageParam, MEDIA_PAGE_SIZE),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}
