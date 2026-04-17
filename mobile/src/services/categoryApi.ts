import api from './api';

// ── Category API ──────────────────────────────────────────────────────────────

const BASE = '/categories';

/**
 * Phase 1 — above-the-fold: category metadata + banners + articles in one request.
 */
export function getCategoryInitial(identifier: string | number, {
  articleBannerCount = 5,
  videoBannerCount   = 3,
  totalBannerCount   = 5,
  articlePageNumber  = 1,
  articlePageSize    = 12,
}: {
  articleBannerCount?: number;
  videoBannerCount?: number;
  totalBannerCount?: number;
  articlePageNumber?: number;
  articlePageSize?: number;
} = {}) {
  return api.get(`${BASE}/${identifier}/initial`, {
    params: { articleBannerCount, videoBannerCount, totalBannerCount, articlePageNumber, articlePageSize },
  });
}

/**
 * Phase 2 — lazy load on scroll: videos + galleries + web stories in one request.
 */
export function getCategoryContent(identifier: string | number, {
  videoPageNumber    = 1,
  videoPageSize      = 12,
  galleryPageNumber  = 1,
  galleryPageSize    = 10,
  webStoryPageNumber = 1,
  webStoryPageSize   = 12,
}: {
  videoPageNumber?: number;
  videoPageSize?: number;
  galleryPageNumber?: number;
  galleryPageSize?: number;
  webStoryPageNumber?: number;
  webStoryPageSize?: number;
} = {}) {
  return api.get(`${BASE}/${identifier}/content`, {
    params: { videoPageNumber, videoPageSize, galleryPageNumber, galleryPageSize, webStoryPageNumber, webStoryPageSize },
  });
}

/**
 * Phase 3 — extended scroll: movies + shows.
 */
export function getCategoryExtended(identifier: string | number, {
  moviePageNumber = 1,
  moviePageSize   = 10,
  showPageNumber  = 1,
  showPageSize    = 10,
}: {
  moviePageNumber?: number;
  moviePageSize?: number;
  showPageNumber?: number;
  showPageSize?: number;
} = {}) {
  return api.get(`${BASE}/${identifier}/extended`, {
    params: { moviePageNumber, moviePageSize, showPageNumber, showPageSize },
  });
}

/**
 * Phase 4 — infinite scroll: paginated articles for a category.
 */
export function loadMoreCategoryArticles(identifier: string | number, {
  pageNumber = 1,
  pageSize   = 12,
}: {
  pageNumber?: number;
  pageSize?: number;
} = {}) {
  return api.get(`${BASE}/${identifier}/articles/load-more`, {
    params: { pageNumber, pageSize },
  });
}
