import { useQuery } from '@tanstack/react-query';
import { fetchMediaGalleryDetails, type GalleryDetail } from '../../../services/api';

export function useGalleryDetails(id: string | number | undefined) {
  return useQuery<GalleryDetail | null>({
    queryKey: ['gallery-details', id],
    queryFn: () => fetchMediaGalleryDetails(id as string | number),
    enabled: id != null && id !== '',
    staleTime: 5 * 60 * 1000,
  });
}
