import type { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Returns the icon to render in a placeholder when an entity's imageUrl
 * is null. Topic results never have images from the backend, and Forum
 * results often don't either — using a chat-bubble for those reads as
 * "discussion" instead of "broken image".
 */
export function entityIcon(entityType: string | null | undefined): IoniconName {
  switch ((entityType ?? '').toLowerCase()) {
    case 'movie':
      return 'film';
    case 'show':
      return 'tv';
    case 'person':
      return 'person';
    case 'article':
      return 'newspaper';
    case 'video':
      return 'play-circle';
    case 'gallery':
      return 'images';
    case 'topic':
      return 'chatbubbles';
    case 'forum':
      return 'people-circle';
    case 'fanfiction':
      return 'book';
    default:
      return 'search';
  }
}
