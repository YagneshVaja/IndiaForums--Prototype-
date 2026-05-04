import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchHomeForumTopics,
  type HomeForumTopic,
  type HomeTopicType,
} from '../../../services/api';

// 5 keeps the response light; the home preview only renders 3 per tab. Extra
// rows are absorbed silently if the API ever returns more.
const HOME_FORUM_PAGE_SIZE = 5;

export function useHomeForumTopics(topicType: HomeTopicType) {
  return useQuery<HomeForumTopic[]>({
    queryKey: ['home-forum-topics', topicType],
    queryFn: () => fetchHomeForumTopics(topicType, HOME_FORUM_PAGE_SIZE),
    staleTime: 2 * 60 * 1000,
    // Retain the prior tab's payload while a new one is in flight so the card
    // grid doesn't blank out for a tab switch (matches /home/articles UX).
    placeholderData: keepPreviousData,
  });
}
