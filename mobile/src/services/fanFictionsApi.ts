import api from './api';

// ── FanFictions API ──────────────────────────────────────────────────────────

const BASE = '/fan-fictions';

/**
 * Get a paginated list of fan fiction stories.
 */
export function getFanFictions({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}) {
  return api.get(BASE, { params: { page, pageSize } });
}

/**
 * Get a single fan fiction's full detail (metadata + chapter list).
 */
export function getFanFictionDetail(id: number | string) {
  return api.get(`${BASE}/${id}`);
}

/**
 * Get the body of a single chapter by chapterId.
 */
export function getFanFictionChapter(chapterId: number | string) {
  return api.get(`${BASE}/chapter/${chapterId}`);
}

/**
 * Get the followers of a fan-fiction author.
 *
 * Currently returns HTTP 400 from the backend.
 */
export function getFanFictionAuthorFollowers(authorId: number | string, { page = 1, pageSize = 24 } = {}) {
  return api.get(`${BASE}/author/${authorId}/followers`, {
    params: { page, pageSize },
  });
}

/**
 * Get the top fan-fiction authors leaderboard.
 *
 * Currently returns HTTP 500 from the backend.
 */
export function getFanFictionAuthors({ page = 1, pageSize = 20 } = {}) {
  return api.get(`${BASE}/authors`, { params: { page, pageSize } });
}
