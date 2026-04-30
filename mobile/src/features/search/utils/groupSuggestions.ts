import type { SuggestItemDto } from '../../../services/searchApi';

const ORDER = [
  'Person',
  'Movie',
  'Show',
  'Topic',
  'Forum',
  'Article',
  'Video',
  'Gallery',
];

export interface SuggestionGroup {
  entityType: string;
  items: SuggestItemDto[];
}

/**
 * Groups suggestions by entityType in a fixed order. Buckets containing zero
 * items are dropped. Within a bucket, the original order (weight) is preserved.
 * Items with a null entityType go into a final "Other" bucket.
 */
export function groupSuggestions(items: SuggestItemDto[]): SuggestionGroup[] {
  const buckets = new Map<string, SuggestItemDto[]>();
  for (const item of items) {
    const key = item.entityType ?? 'Other';
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const groups: SuggestionGroup[] = [];
  for (const t of ORDER) {
    const items = buckets.get(t);
    if (items && items.length > 0) groups.push({ entityType: t, items });
    buckets.delete(t);
  }
  // Anything left over (unknown entityType, "Other") trails alphabetically.
  const leftover = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [entityType, items] of leftover) {
    groups.push({ entityType, items });
  }
  return groups;
}
