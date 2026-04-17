import api from './api';

// ── Category API ──────────────────────────────────────────────────────────────
// Routes (per OpenAPI spec, all verified 2026-04-14):
//
//   GET /categories/{identifier}/initial          — Phase 1: category + banners + articles (cached 2 min)
//   GET /categories/{identifier}/content          — Phase 2: videos + galleries + web stories (cached 1 min)
//   GET /categories/{identifier}/extended         — Phase 3: movies + shows (cached 3 min)
//   GET /categories/{identifier}/articles/load-more — Phase 4: infinite-scroll articles (cached 2 min)
//
// `identifier` accepts both numeric category ID and URL slug (e.g. 'tv', 'movies').
//
// Usage pattern for a CategoryScreen:
//   mount  → getCategoryInitial('tv')             (above-the-fold: header + banners + articles)
//   scroll → getCategoryContent('tv')             (lazy: videos, galleries, web stories)
//   scroll → getCategoryExtended('tv')            (extended: movies + shows)
//   "load more" button → loadMoreArticles('tv', { pageNumber: 2 })
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/categories';

/**
 * Phase 1 — above-the-fold: category metadata + banners + articles in one request.
 *
 * @param {string|number} identifier  category ID or slug (e.g. 'tv', 'movies', 5)
 * @param {object} [args]
 * @param {number} [args.articleBannerCount=5]
 * @param {number} [args.videoBannerCount=3]
 * @param {number} [args.totalBannerCount=5]
 * @param {number} [args.articlePageNumber=1]
 * @param {number} [args.articlePageSize=12]
 */
export function getCategoryInitial(identifier, {
  articleBannerCount = 5,
  videoBannerCount   = 3,
  totalBannerCount   = 5,
  articlePageNumber  = 1,
  articlePageSize    = 12,
} = {}) {
  return api.get(`${BASE}/${identifier}/initial`, {
    params: { articleBannerCount, videoBannerCount, totalBannerCount, articlePageNumber, articlePageSize },
  });
}

/**
 * Phase 2 — lazy load on scroll: videos + galleries + web stories in one request.
 *
 * @param {string|number} identifier
 * @param {object} [args]
 * @param {number} [args.videoPageNumber=1]
 * @param {number} [args.videoPageSize=12]
 * @param {number} [args.galleryPageNumber=1]
 * @param {number} [args.galleryPageSize=10]
 * @param {number} [args.webStoryPageNumber=1]
 * @param {number} [args.webStoryPageSize=12]
 */
export function getCategoryContent(identifier, {
  videoPageNumber    = 1,
  videoPageSize      = 12,
  galleryPageNumber  = 1,
  galleryPageSize    = 10,
  webStoryPageNumber = 1,
  webStoryPageSize   = 12,
} = {}) {
  return api.get(`${BASE}/${identifier}/content`, {
    params: { videoPageNumber, videoPageSize, galleryPageNumber, galleryPageSize, webStoryPageNumber, webStoryPageSize },
  });
}

/**
 * Phase 3 — extended scroll: movies + shows for categories that support them
 * (e.g. 'movies', 'tv'). Empty arrays returned for categories without these.
 *
 * @param {string|number} identifier
 * @param {object} [args]
 * @param {number} [args.moviePageNumber=1]
 * @param {number} [args.moviePageSize=10]
 * @param {number} [args.showPageNumber=1]
 * @param {number} [args.showPageSize=10]
 */
export function getCategoryExtended(identifier, {
  moviePageNumber = 1,
  moviePageSize   = 10,
  showPageNumber  = 1,
  showPageSize    = 10,
} = {}) {
  return api.get(`${BASE}/${identifier}/extended`, {
    params: { moviePageNumber, moviePageSize, showPageNumber, showPageSize },
  });
}

/**
 * Phase 4 — infinite scroll: paginated articles for a category.
 * Call this for "load more" after the initial article set from Phase 1.
 *
 * @param {string|number} identifier
 * @param {object} [args]
 * @param {number} [args.pageNumber=1]
 * @param {number} [args.pageSize=12]
 */
export function loadMoreCategoryArticles(identifier, {
  pageNumber = 1,
  pageSize   = 12,
} = {}) {
  return api.get(`${BASE}/${identifier}/articles/load-more`, {
    params: { pageNumber, pageSize },
  });
}
