import api from './api';

// ── FanFictions API ──────────────────────────────────────────────────────────
// 5 endpoints verified live on 2026-04-07 against https://api2.indiaforums.com:
//
//   GET /fan-fictions?page&pageSize             — paginated story list ✅
//   GET /fan-fictions/{id}                      — story detail + chapters ✅
//   GET /fan-fictions/chapter/{chapterId}       — single chapter body ✅
//   GET /fan-fictions/authors                   — 500 ❌ (backend broken)
//   GET /fan-fictions/author/{id}/followers     — 400 ❌ (backend broken)
//
// The list endpoint only accepts `page` + `pageSize` (any other query params
// are silently ignored — verified by testing sort/genre/type/status variants
// against the live server and getting identical result sets). Client-side
// filtering is applied in FanFictionScreen after the data arrives.

const BASE = '/fan-fictions';

/**
 * Get a paginated list of fan fiction stories.
 *
 * Response shape:
 *   { data: { fanFictions: FanFiction[] }, pagination: { currentPage, pageSize, totalPages, totalItems, hasNextPage, hasPreviousPage } }
 *
 * @param {object} [args]
 * @param {number} [args.page=1]
 * @param {number} [args.pageSize=20]
 */
export function getFanFictions({ page = 1, pageSize = 20 } = {}) {
  return api.get(BASE, { params: { page, pageSize } });
}

/**
 * Get a single fan fiction's full detail (metadata + chapter list).
 *
 * Response shape:
 *   { fanFiction: FanFictionDetail, chapters: ChapterSummary[] }
 */
export function getFanFictionDetail(id) {
  return api.get(`${BASE}/${id}`);
}

/**
 * Get the body of a single chapter by chapterId.
 *
 * Response shape: flat Chapter object (no envelope).
 *   { chapterId, fanFictionId, chapterTitle, chapterContent (HTML),
 *     filteredChapterContent, userId, orderNumber, viewCount, likeCount,
 *     commentCount, chapterPublishedWhen, ... }
 */
export function getFanFictionChapter(chapterId) {
  return api.get(`${BASE}/chapter/${chapterId}`);
}

/**
 * Get the followers of a fan-fiction author.
 *
 * ⚠️ Currently returns HTTP 400 from the backend. Tracked in
 * docs/backend-issues-2026-04-07.md.
 */
export function getFanFictionAuthorFollowers(authorId, { page = 1, pageSize = 24 } = {}) {
  return api.get(`${BASE}/author/${authorId}/followers`, {
    params: { page, pageSize },
  });
}

/**
 * Get the top fan-fiction authors leaderboard.
 *
 * ⚠️ Currently returns HTTP 500 from the backend. Tracked in
 * docs/backend-issues-2026-04-07.md.
 */
export function getFanFictionAuthors({ page = 1, pageSize = 20 } = {}) {
  return api.get(`${BASE}/authors`, { params: { page, pageSize } });
}
