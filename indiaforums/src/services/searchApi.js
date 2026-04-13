import api from './api';

// ── Search API ───────────────────────────────────────────────────────────────
// Confirmed endpoints (backend team, 2026-04-13):
//
//   GET /api/v{version}/search            — global search across content types
//   GET /api/v{version}/search/suggestions — autocomplete typeahead (query ≥ 2 chars)
//   GET /api/v{version}/search/trending    — currently-trending search queries
//
// Version resolves to 1 (API_VERSION in api.js → baseURL: /api/v1).
// Vite dev proxy forwards /api → https://api2.indiaforums.com.
//
// ── Live backend status (last checked 2026-04-13) ───────────────────────────
//   GET /search?contentType=0  (Google CSE)  ✅ returns results
//   GET /search?contentType=1–9              ⚠  500 — EF Core FromSql missing
//                                               column (Class D). Falls back to
//                                               contentType=0 in SearchScreen.
//   GET /search/suggestions                  ⚠  500 — missing ContentTypeId col
//   GET /search/trending                     ⚠  500 — missing ContentTypeId col
//
// Frontend is already wired to all three. Fix the backend Class D bug and
// suggestions + trending go live automatically — no frontend changes needed.
// ────────────────────────────────────────────────────────────────────────────

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
 *
 * @param {object}  args
 * @param {string}  args.query          - search term (required)
 * @param {number} [args.contentType=0] - one of CONTENT_TYPE.* (default ALL = Google CSE)
 * @param {number} [args.pageNumber=1]
 * @param {number} [args.pageSize=20]
 * @param {string} [args.cursor]        - for cursor-based pagination
 * @param {boolean}[args.fetchBackward]
 * @param {number} [args.forumId]       - narrow Topic search to a specific forum
 *
 * @returns {Promise} axios response — `res.data` shape:
 *   { results: Array, totalCount: number, pageNumber, pageSize, totalPages }
 *   Each result (contentType=0 / Google CSE):
 *   { title, link, snippet, displayLink, pagemap?: { cse_image, cse_thumbnail } }
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
  if (cursor        != null) params.cursor        = cursor;
  if (fetchBackward != null) params.fetchBackward = fetchBackward;
  if (forumId       != null) params.forumId       = forumId;
  return api.get('/search', { params });
}

/**
 * Autocomplete suggestions for a partial query (≥ 2 chars).
 *
 * ⚠ Currently 500s (Class D-1 — missing ContentTypeId column in SQL SELECT).
 *   SearchScreen swallows the error silently — no banner for a typeahead.
 *
 * @returns {Promise} axios response — `res.data` shape (when working):
 *   { suggestions: string[] }  OR  { items: string[] }
 */
export function searchSuggestions(query) {
  return api.get('/search/suggestions', { params: { query } });
}

/**
 * Currently-trending search queries (for empty-state display).
 *
 * ⚠ Currently 500s (Class D-1 — same root cause as suggestions).
 *   SearchScreen falls back to STATIC_TRENDING when this errors.
 *
 * @returns {Promise} axios response — `res.data` shape (when working):
 *   { trending: string[] }  OR  { items: string[] }
 */
export function getTrendingSearches() {
  return api.get('/search/trending');
}
