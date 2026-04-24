import { useQuery } from '@tanstack/react-query';
import {
  fetchWebStoryDetails,
  type WebStoryDetails,
} from '../../../services/api';

export function useWebStoryDetails(storyId: number | null | undefined) {
  return useQuery<WebStoryDetails>({
    queryKey: ['webstory', storyId],
    queryFn: () => fetchWebStoryDetails(storyId as number),
    enabled: storyId != null,
    staleTime: 10 * 60 * 1000,
  });
}
