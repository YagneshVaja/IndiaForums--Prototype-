import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchArticles } from '../../../services/api';

export function useNewsArticles(category?: string) {
  return useInfiniteQuery({
    queryKey: ['articles', 'news', category ?? 'all'],
    queryFn: ({ pageParam }) =>
      fetchArticles({ category, page: pageParam as number, limit: 20 }),
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < 20) return undefined;
      return (lastPageParam as number) + 1;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
}
