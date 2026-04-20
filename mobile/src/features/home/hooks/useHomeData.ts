import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchBanners,
  fetchArticles,
  fetchCelebrities,
} from '../../../services/api';

// ---------------------------------------------------------------------------
// useFeaturedBanners
// ---------------------------------------------------------------------------

export function useFeaturedBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: fetchBanners,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useHomeArticles
// ---------------------------------------------------------------------------

export function useHomeArticles(category?: string) {
  return useQuery({
    queryKey: ['articles', 'home', category],
    queryFn: () => fetchArticles({ category, page: 1, limit: 20 }),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------
// useCelebrities
// ---------------------------------------------------------------------------

export function useCelebrities() {
  return useQuery({
    queryKey: ['celebrities'],
    queryFn: () => fetchCelebrities(),
    staleTime: 10 * 60 * 1000,
  });
}
