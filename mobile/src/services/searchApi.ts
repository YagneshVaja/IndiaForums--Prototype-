import api from './api';

// ── Search API ───────────────────────────────────────────────────────────────

/** ContentType codes (per OpenAPI spec description block on GET /search) */
export const CONTENT_TYPE = {
  ALL:       0, // Google CSE — external search, always works
  ARTICLE:   1,
  MOVIE:     2,
  SHOW:      3,
  CELEBRITY: 4,
  VIDEO:     5,
  PHOTO:     6,
  CHANNEL:   7,
  TOPIC:     8,
  USER:      9,
};

/**
 * Global search across content types.
 */
export function search({
  query,
  contentType = CONTENT_TYPE.ALL,
  pageNumber = 1,
  pageSize = 20,
  cursor,
  fetchBackward,
  forumId,
}: {
  query: string;
  contentType?: number;
  pageNumber?: number;
  pageSize?: number;
  cursor?: string;
  fetchBackward?: boolean;
  forumId?: number;
} = { query: '' }) {
  const params: any = { query, contentType, pageNumber, pageSize };
  if (cursor        != null) params.cursor        = cursor;
  if (fetchBackward != null) params.fetchBackward = fetchBackward;
  if (forumId       != null) params.forumId       = forumId;
  return api.get('/search', { params });
}

/**
 * Autocomplete suggestions for a partial query (>= 2 chars).
 */
export function searchSuggestions(query: string) {
  return api.get('/search/suggestions', { params: { query } });
}

/**
 * Currently-trending search queries (for empty-state display).
 */
export function getTrendingSearches() {
  return api.get('/search/trending');
}
