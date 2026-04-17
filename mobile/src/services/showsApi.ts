import api from './api';

// ── Shows API ────────────────────────────────────────────────────────────────

const BASE = '/shows';

// ShowsByMode mode codes (per spec description block):
export const SHOWS_BY_MODE = {
  CATEGORY: 0,
  PERSON:   3,
  CHANNEL:  7,
};

/* ── Read ──────────────────────────────────────────────────────────────── */

/**
 * Get a paginated list of TV shows.
 *
 * NOTE: backend currently returns an empty `shows` array regardless of params
 * (Class C-1 bug). Use `getChaskaMeter()` as a temporary fallback.
 */
export function getShows({ page = 1, pageSize = 12, categoryId }: {
  page?: number;
  pageSize?: number;
  categoryId?: number;
} = {}) {
  const params: any = { page, pageSize };
  if (categoryId !== undefined && categoryId !== null) params.categoryId = categoryId;
  return api.get(BASE, { params });
}

/**
 * Get shows by advanced mode (Category, Person, Channel).
 */
export function getShowsByMode({ mode, id, page = 1, pageSize = 12 }: {
  mode: number;
  id?: number;
  page?: number;
  pageSize?: number;
}) {
  const params: any = { mode, page, pageSize };
  if (id !== undefined && id !== null) params.id = id;
  return api.get(`${BASE}/by-mode`, { params });
}

/**
 * Get the latest ChaskaMeter rankings (or a specific period).
 */
export function getChaskaMeter(cmid?: number) {
  const params: any = {};
  if (cmid !== undefined && cmid !== null) params.cmid = cmid;
  return api.get(`${BASE}/chaskameter`, { params });
}

/**
 * Get show details + story/plot.
 *
 * NOTE: backend returns 404 for every id tested (Class C-2 bug).
 */
export function getShowAbout(id: number | string) {
  return api.get(`${BASE}/${id}/about`);
}

/**
 * Get a show's cast and crew (paginated).
 *
 * NOTE: backend returns 404 for every id tested (Class C-2 bug).
 */
export function getShowCast(id: number | string, { page = 1, pageSize = 24 } = {}) {
  return api.get(`${BASE}/${id}/cast`, { params: { page, pageSize } });
}

/**
 * Get a show's fanclub members.
 *
 * NOTE: backend returns 404 for every id tested (Class C-2 bug).
 */
export function getShowFanclub(id: number | string, { page = 1, pageSize = 72, userId }: {
  page?: number;
  pageSize?: number;
  userId?: number;
} = {}) {
  const params: any = { page, pageSize };
  if (userId) params.userId = userId;
  return api.get(`${BASE}/${id}/fanclub`, { params });
}

/* ── Write (auth required) ─────────────────────────────────────────────── */

/**
 * Submit a ChaskaMeter rating for a TV show. Requires auth.
 * One vote per user per show — backend enforces.
 */
export function rateShow(showId: number | string, { rating }: { rating: number }) {
  return api.post(`${BASE}/${showId}/rate`, { rate: rating });
}
