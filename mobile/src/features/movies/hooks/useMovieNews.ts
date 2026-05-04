import { useQuery } from '@tanstack/react-query';
import { fetchArticleList, type Article } from '../../../services/api';

/**
 * Returns the latest IndiaForums news articles. The /articles/list endpoint
 * does not honour movie-specific filtering (verified — passing contentId has
 * no effect), so this is site-wide news. The detail screen labels it as
 * "Latest from IndiaForums" rather than "About this movie".
 *
 * `enabled` defaults to false — callers gate the fetch on section visibility
 * so the cold-load on a movie's detail screen isn't blocked on news.
 */
export function useMovieNews(limit = 6, enabled = true) {
  return useQuery<Article[]>({
    queryKey: ['movieNews', limit],
    queryFn: () => fetchArticleList({ page: 1, limit }),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  });
}
