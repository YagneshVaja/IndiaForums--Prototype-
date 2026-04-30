/**
 * Returns the secondary metadata line shown under a search title.
 * No backend calls — only uses the entityType + the optional summary text
 * already on the search payload.
 */
export function entityMetadataLine(
  entityType: string | null | undefined,
  summary?: string | null,
): string {
  const t = (entityType ?? '').toLowerCase();
  const yearMatch = summary ? /(19|20)\d{2}/.exec(summary) : null;
  const year = yearMatch ? yearMatch[0] : null;

  switch (t) {
    case 'movie':
      return year ? `Movie · ${year}` : 'Movie';
    case 'show':
      return year ? `TV Show · ${year}` : 'TV Show';
    case 'person':
      return 'Celebrity';
    case 'article':
      return 'Article';
    case 'video':
      return 'Video';
    case 'gallery':
      return 'Photo Gallery';
    case 'topic':
      return 'Forum Topic';
    case 'forum':
      return 'Forum';
    default:
      return entityType ?? '';
  }
}
