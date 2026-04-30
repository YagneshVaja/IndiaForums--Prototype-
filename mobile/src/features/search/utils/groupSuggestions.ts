import type { SuggestItemDto, SearchResultItemDto } from '../../../services/searchApi';

const ORDER = [
  'Person',
  'Movie',
  'Show',
  'Topic',
  'Forum',
  'Article',
  'Video',
  'Gallery',
  'FanFiction',
];

export interface SuggestionGroup {
  entityType: string;
  items: SuggestItemDto[];
}

export interface ResultGroup {
  entityType: string;
  items: SearchResultItemDto[];
}

/**
 * Generic worker. Groups items by entityType in the fixed ORDER above.
 * Empty buckets are dropped. Original order is preserved within each bucket.
 * Items with a null entityType go into a final "Other" bucket.
 */
function groupByEntityType<T extends { entityType: string | null }>(
  items: T[],
): { entityType: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = item.entityType ?? 'Other';
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const groups: { entityType: string; items: T[] }[] = [];
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

export function groupSuggestions(items: SuggestItemDto[]): SuggestionGroup[] {
  return groupByEntityType(items);
}

export function groupResults(items: SearchResultItemDto[]): ResultGroup[] {
  return groupByEntityType(items);
}
