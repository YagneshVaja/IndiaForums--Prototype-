import api from './api';

// ── Home API ─────────────────────────────────────────────────────────────────
// Routes (per OpenAPI spec, all verified 2026-04-14):
//
//   GET /home/initial        — Phase 1: banners + articles in one call (cached 2 min)
//   GET /home/content        — Phase 2: topics + channels in one call (cached 1 min)
//   GET /home/latest         — Phase 3: galleries/stories/quizzes/videos/movies (cached 3 min)
//   GET /home/members        — Phase 4: online members (auth required, cached 30 s)
//   GET /home/banners        — standalone banners (cached 5 min)
//   GET /home/articles       — standalone articles with type filter (cached 2 min)
//   GET /home/topics         — standalone forum topics (cached 1 min)
//   GET /home/channels       — standalone channels + shows (cached 10 min)
//   GET /home/latest-content — standalone latest media snapshot
//   GET /home/online-users   — standalone online-user count (cached 30 s, no auth)
//
// Usage pattern for ExploreScreen:
//   mount  → getHomeInitial()          (above-the-fold: banners + articles)
//   scroll → getHomeContent()          (lazy: topics + channels)
//   scroll → getHomeLatest()           (extended: galleries, videos, quizzes…)
//   auth   → getHomeOnlineMembers()    (auth-gated widget)
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/home';

// ── Aggregated phase loaders (use these in screens) ──────────────────────────

/**
 * Phase 1 — above-the-fold: featured banners + articles in one request.
 *
 * @param {object} [args]
 * @param {number} [args.categoryId]         filter to a category
 * @param {number} [args.articleCount=5]     banner article count
 * @param {number} [args.videoCount=3]       banner video count
 * @param {number} [args.totalBannerCount=5] total banners returned
 * @param {string} [args.articleType='all']  'all'|'tv'|'movies'|'digital'|'lifestyle'|'sports'
 * @param {number} [args.articlePageNumber=1]
 * @param {number} [args.articlePageSize=12]
 */
export function getHomeInitial({
  categoryId,
  articleCount      = 5,
  videoCount        = 3,
  totalBannerCount  = 5,
  articleType       = 'all',
  articlePageNumber = 1,
  articlePageSize   = 12,
} = {}) {
  const params = {
    articleCount,
    videoCount,
    totalBannerCount,
    articleType,
    articlePageNumber,
    articlePageSize,
  };
  if (categoryId != null) params.categoryId = categoryId;
  return api.get(`${BASE}/initial`, { params });
}

/**
 * Phase 2 — lazy load on scroll: forum topics + channels in one request.
 *
 * @param {object} [args]
 * @param {string} [args.topicType='popular']  'popular'|'ga'|'lt'
 * @param {number} [args.categoryId]
 * @param {number} [args.topicPageNumber=1]
 * @param {number} [args.topicPageSize=20]
 * @param {number} [args.channelPageNumber=1]
 * @param {number} [args.channelPageSize=10]
 * @param {number} [args.showsPageSize=9]
 */
export function getHomeContent({
  topicType         = 'popular',
  categoryId,
  topicPageNumber   = 1,
  topicPageSize     = 20,
  channelPageNumber = 1,
  channelPageSize   = 10,
  showsPageSize     = 9,
} = {}) {
  const params = {
    topicType,
    topicPageNumber,
    topicPageSize,
    channelPageNumber,
    channelPageSize,
    showsPageSize,
  };
  if (categoryId != null) params.categoryId = categoryId;
  return api.get(`${BASE}/content`, { params });
}

/**
 * Phase 3 — extended scroll: galleries, web stories, quizzes, videos,
 * movies, and celebrity rankings. No params — backend aggregates all.
 */
export function getHomeLatest() {
  return api.get(`${BASE}/latest`);
}

/**
 * Phase 4 — auth-gated: online members widget.
 * Returns 401 if not authenticated — callers should guard with auth check.
 */
export function getHomeOnlineMembers() {
  return api.get(`${BASE}/members`);
}

// ── Standalone loaders (use when you only need one slice) ────────────────────

/**
 * Featured banners only (articles + videos, randomised). Cached 5 min.
 *
 * @param {object} [args]
 * @param {number} [args.categoryId]
 * @param {number} [args.articleCount=5]
 * @param {number} [args.videoCount=3]
 * @param {number} [args.totalCount=5]
 */
export function getHomeBanners({
  categoryId,
  articleCount = 5,
  videoCount   = 3,
  totalCount   = 5,
} = {}) {
  const params = { articleCount, videoCount, totalCount };
  if (categoryId != null) params.categoryId = categoryId;
  return api.get(`${BASE}/banners`, { params });
}

/**
 * Filtered articles only. articleType: 'all'|'tv'|'movies'|'digital'|'lifestyle'|'sports'.
 *
 * @param {object} [args]
 * @param {string} [args.articleType='all']
 * @param {number} [args.pageNumber=1]
 * @param {number} [args.pageSize=12]
 * @param {boolean}[args.fetchBackward=false]
 */
export function getHomeArticles({
  articleType   = 'all',
  pageNumber    = 1,
  pageSize      = 12,
  fetchBackward = false,
} = {}) {
  return api.get(`${BASE}/articles`, {
    params: { articleType, pageNumber, pageSize, fetchBackward },
  });
}

/**
 * Forum topics for home feed. topicType: 'popular'|'ga'|'lt'.
 *
 * @param {object} [args]
 * @param {string} [args.topicType='popular']
 * @param {number} [args.categoryId]
 * @param {number} [args.pageNumber=1]
 * @param {number} [args.pageSize=20]
 * @param {boolean}[args.fetchBackward=false]
 * @param {number} [args.cursor]
 * @param {number} [args.hourDifference=-24]
 * @param {number} [args.forumId=0]
 */
export function getHomeTopics({
  topicType     = 'popular',
  categoryId,
  pageNumber    = 1,
  pageSize      = 20,
  fetchBackward = false,
  cursor,
  hourDifference = -24,
  forumId        = 0,
} = {}) {
  const params = {
    topicType, pageNumber, pageSize, fetchBackward, hourDifference, forumId,
  };
  if (categoryId != null) params.categoryId = categoryId;
  if (cursor     != null) params.cursor     = cursor;
  return api.get(`${BASE}/topics`, { params });
}

/**
 * Channels with their top shows. Cached 10 min.
 *
 * @param {object} [args]
 * @param {number} [args.pageNumber=1]
 * @param {number} [args.pageSize=10]
 * @param {number} [args.showsPageSize=9]
 * @param {boolean}[args.includeArchived=false]
 */
export function getHomeChannels({
  pageNumber      = 1,
  pageSize        = 10,
  showsPageSize   = 9,
  includeArchived = false,
} = {}) {
  return api.get(`${BASE}/channels`, {
    params: { pageNumber, pageSize, showsPageSize, includeArchived },
  });
}

/**
 * Latest media snapshot: galleries, web stories, quizzes, videos, movies,
 * celebrity rankings. Cached 3 min. No params.
 */
export function getHomeLatestContent() {
  return api.get(`${BASE}/latest-content`);
}

/**
 * Online-user count + privacy stats. Cached 30 s. No auth required.
 */
export function getHomeOnlineUsers() {
  return api.get(`${BASE}/online-users`);
}
