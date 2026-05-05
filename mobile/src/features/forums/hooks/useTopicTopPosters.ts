import { useQuery } from '@tanstack/react-query';
import { fetchTopicTopPosters, type TopicTopPoster } from '../../../services/api';

/**
 * Top posters for a topic, ordered by post count (highest first).
 * Powers the "Frequent Posters" strip — same data source as the live website's
 * post-count avatars rail at the bottom of the topic header.
 */
export function useTopicTopPosters(topicId: number | null, pageSize = 12) {
  return useQuery<TopicTopPoster[]>({
    queryKey: ['topic-top-posters', topicId, pageSize],
    queryFn: () => fetchTopicTopPosters(topicId!, pageSize),
    enabled: typeof topicId === 'number' && Number.isFinite(topicId) && topicId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
