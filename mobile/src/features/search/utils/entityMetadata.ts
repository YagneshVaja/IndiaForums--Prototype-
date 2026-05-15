import type { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type EntityKind =
  | 'Article'
  | 'Movie'
  | 'Show'
  | 'Person'
  | 'Video'
  | 'Gallery'
  | 'Topic'
  | 'Forum'
  | 'Channel'
  | 'Member'
  | 'Unknown';

/**
 * Smart API contentType strings are plural ("Topics", "People", "Galleries",
 * "Members"). Older code paths use the singular form. Normalise once here so
 * every consumer can switch on a single canonical value.
 */
export function normalizeContentType(raw: string | null | undefined): EntityKind {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'article':
    case 'articles':
      return 'Article';
    case 'movie':
    case 'movies':
      return 'Movie';
    case 'show':
    case 'shows':
      return 'Show';
    case 'person':
    case 'people':
    case 'celebrity':
    case 'celebrities':
      return 'Person';
    case 'video':
    case 'videos':
      return 'Video';
    case 'gallery':
    case 'galleries':
    case 'photo':
    case 'photos':
      return 'Gallery';
    case 'topic':
    case 'topics':
      return 'Topic';
    case 'forum':
    case 'forums':
      return 'Forum';
    case 'channel':
    case 'channels':
      return 'Channel';
    case 'member':
    case 'members':
    case 'user':
    case 'users':
      return 'Member';
    default:
      return 'Unknown';
  }
}

const KIND_TO_CONTENT_TYPE_ID: Record<EntityKind, number | null> = {
  Article: 1,
  Movie: 2,
  Show: 3,
  Person: 4,
  Video: 5,
  Gallery: 6,
  Channel: 7,
  Topic: 8,
  Member: 9,
  Forum: null,
  Unknown: null,
};

export function contentTypeIdFor(kind: EntityKind): number | null {
  return KIND_TO_CONTENT_TYPE_ID[kind];
}

export function entityLabel(kind: EntityKind): string {
  switch (kind) {
    case 'Article':  return 'Article';
    case 'Movie':    return 'Movie';
    case 'Show':     return 'TV Show';
    case 'Person':   return 'Celebrity';
    case 'Video':    return 'Video';
    case 'Gallery':  return 'Photo Gallery';
    case 'Topic':    return 'Forum Topic';
    case 'Forum':    return 'Forum';
    case 'Channel':  return 'Channel';
    case 'Member':   return 'Member';
    default:         return 'Item';
  }
}

export function entitySectionLabel(kind: EntityKind): string {
  switch (kind) {
    case 'Article':  return 'Articles';
    case 'Movie':    return 'Movies';
    case 'Show':     return 'Shows';
    case 'Person':   return 'People';
    case 'Video':    return 'Videos';
    case 'Gallery':  return 'Galleries';
    case 'Topic':    return 'Topics';
    case 'Forum':    return 'Forums';
    case 'Channel':  return 'Channels';
    case 'Member':   return 'Members';
    default:         return 'Other';
  }
}

export function entityIcon(kind: EntityKind): IoniconName {
  switch (kind) {
    case 'Movie':    return 'film';
    case 'Show':     return 'tv';
    case 'Person':   return 'person';
    case 'Article':  return 'newspaper';
    case 'Video':    return 'play-circle';
    case 'Gallery':  return 'images';
    case 'Topic':    return 'chatbubbles';
    case 'Forum':    return 'people-circle';
    case 'Channel':  return 'radio';
    case 'Member':   return 'person-circle';
    default:         return 'search';
  }
}

/**
 * Back-compat shim — the metadata line used to take entityType + summary.
 * Smart items don't have a summary, so this is just a relabel call.
 */
export function entityMetadataLine(contentType: string | null | undefined): string {
  return entityLabel(normalizeContentType(contentType));
}
