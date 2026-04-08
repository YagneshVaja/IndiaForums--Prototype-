import api from './api';

// ── Search API ───────────────────────────────────────────────────────────────
// Routes (per OpenAPI spec, audited Phase 9 — 2026-04-07):
//   GET /search               — global search across content types
//   GET /search/suggestions   — autocomplete typeahead (query ≥ 2 chars)  ⚠ broken
//   GET /search/trending      — currently-trending queries                ⚠ broken
//
// Backend status:
//   - /search?contentType=0 (Google CSE) — ✅ works, returns 200 even for empty results
//   - /search?contentType=1|2|3 (Article/Movie/Show) — ⚠ 500 Class D (EF Core FromSql
//     column-mapping bug). See docs/backend-issues-2026-04-07.md, D-2.
//   - /search/suggestions — ⚠ 500 Class D ("ContentTypeId column missing"), D-1
//   - /search/trending    — ⚠ 500 Class D (same root cause), D-1
//
// Until D-1/D-2 are fixed, the UI should default to contentType=0 and show
// graceful empty states for the autocomplete dropdown and trending pills.

// ContentType codes (per spec description block on /search):
export const CONTENT_TYPE = {
  ALL:       0, // Google CSE (external)
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
 *
 * NOTE: only `contentType=0` (Google CSE) is currently backend-healthy.
 * All other content types return 500 until Class D is fixed.
 *
 * @param {object} args
 * @param {string}  args.query
 * @param {number} [args.contentType=0]   one of CONTENT_TYPE.*
 * @param {number} [args.pageNumber=1]
 * @param {number} [args.pageSize=20]
 * @param {string} [args.cursor]          for cursor-based pagination
 * @param {boolean}[args.fetchBackward]
 * @param {number} [args.forumId]         narrow to a specific forum (Topic search)
 */
export function search({
  query,
  contentType = CONTENT_TYPE.ALL,
  pageNumber = 1,
  pageSize = 20,
  cursor,
  fetchBackward,
  forumId,
} = {}) {
  const params = { query, contentType, pageNumber, pageSize };
  if (cursor)        params.cursor = cursor;
  if (fetchBackward) params.fetchBackward = fetchBackward;
  if (forumId)       params.forumId = forumId;
  return api.get('/search', { params });
}

/**
 * Get autocomplete suggestions for a partial query.
 *
 * ⚠ Backend currently 500s (Class D-1). UI should swallow errors silently
 * and show nothing — do not surface a banner for a typeahead dropdown.
 */
export function searchSuggestions(query) {
  return api.get('/search/suggestions', { params: { query } });
}

/**
 * Get currently-trending search queries (for empty-state display).
 *
 * ⚠ Backend currently 500s (Class D-1). UI should fall back to a static
 * hint list or hide the trending section entirely.
 */
export function getTrendingSearches() {
  return api.get('/search/trending');
}
