import { useQuery } from '@tanstack/react-query';
import { fetchMediaGalleries, type Gallery } from '../../../services/api';

const HOME_PAGE_SIZE = 8;

/**
 * Single-page preview of /media-galleries/list for the home photo strip.
 * The full archive lives on the Galleries screen; this hook just powers the
 * 4-up horizontal preview that sits after Forums.
 */
export function useHomeMediaGalleries() {
  return useQuery<Gallery[]>({
    queryKey: ['home-media-galleries'],
    queryFn: async () => {
      const page = await fetchMediaGalleries(1, HOME_PAGE_SIZE, null);
      return page.galleries;
    },
    staleTime: 5 * 60 * 1000,
  });
}
