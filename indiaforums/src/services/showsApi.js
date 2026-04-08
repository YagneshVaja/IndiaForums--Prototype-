import api from './api';

// ── Shows API ────────────────────────────────────────────────────────────────
// Routes (per OpenAPI spec, audited Phase 7 — 2026-04-07):
//   GET    /shows                       — list (with optional categoryId filter) ⚠ broken
//   GET    /shows/by-mode               — filtered list (Person, Channel, Category)
//   GET    /shows/chaskameter           — ChaskaMeter rankings
//   GET    /shows/{id}/about            — show details + story  ⚠ broken
//   GET    /shows/{id}/cast             — cast & crew           ⚠ broken
//   GET    /shows/{id}/fanclub          — fan list              ⚠ broken
//   POST   /shows/{id}/rate             — rate a show 1–5 (auth)
//
// Backend status:
//   - GET /shows         returns `{shows: [], totalCount: 46}` — empty array bug
//                        (see docs/backend-issues-2026-04-07.md, Class C-1)
//   - GET /shows/{id}/*  returns 404 for every titleId, even ones returned by
//                        /shows/chaskameter (see Class C-2)
//   - GET /shows/chaskameter — works, returns real titles + IDs
//   - POST /shows/{id}/rate — clean 401 unauthenticated (write path is healthy)
//
// Until C-1 + C-2 are fixed, the only usable read path is /shows/chaskameter.
// The rate endpoint is wired here so it works as soon as a UI surface exists.

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
 * (Class C-1 bug, 2026-04-07). Use `getChaskaMeter()` as a temporary fallback.
 *
 * @param {object} [args]
 * @param {number} [args.page=1]
 * @param {number} [args.pageSize=12]
 * @param {number} [args.categoryId]
 */
export function getShows({ page = 1, pageSize = 12, categoryId } = {}) {
  const params = { page, pageSize };
  if (categoryId !== undefined && categoryId !== null) params.categoryId = categoryId;
  return api.get(BASE, { params });
}

/**
 * Get shows by advanced mode (Category, Person, Channel).
 *
 * @param {object} args
 * @param {number} args.mode    one of SHOWS_BY_MODE.*
 * @param {number} [args.id]    personId / channelId / categoryId depending on mode
 * @param {number} [args.page=1]
 * @param {number} [args.pageSize=12]
 */
export function getShowsByMode({ mode, id, page = 1, pageSize = 12 }) {
  const params = { mode, page, pageSize };
  if (id !== undefined && id !== null) params.id = id;
  return api.get(`${BASE}/by-mode`, { params });
}

/**
 * Get the latest ChaskaMeter rankings (or a specific period).
 *
 * @param {number} [cmid]  ChaskaMeter period id; omit for the latest period
 */
export function getChaskaMeter(cmid) {
  const params = {};
  if (cmid !== undefined && cmid !== null) params.cmid = cmid;
  return api.get(`${BASE}/chaskameter`, { params });
}

/**
 * Get show details + story/plot.
 *
 * NOTE: backend returns 404 for every id tested (Class C-2 bug, 2026-04-07).
 */
export function getShowAbout(id) {
  return api.get(`${BASE}/${id}/about`);
}

/**
 * Get a show's cast and crew (paginated).
 *
 * NOTE: backend returns 404 for every id tested (Class C-2 bug, 2026-04-07).
 */
export function getShowCast(id, { page = 1, pageSize = 24 } = {}) {
  return api.get(`${BASE}/${id}/cast`, { params: { page, pageSize } });
}

/**
 * Get a show's fanclub members.
 *
 * NOTE: backend returns 404 for every id tested (Class C-2 bug, 2026-04-07).
 *
 * @param {number} id
 * @param {object} [args]
 * @param {number} [args.userId]   if set, also reports whether this user is a fan
 */
export function getShowFanclub(id, { page = 1, pageSize = 72, userId } = {}) {
  const params = { page, pageSize };
  if (userId) params.userId = userId;
  return api.get(`${BASE}/${id}/fanclub`, { params });
}

/* ── Write (auth required) ─────────────────────────────────────────────── */

/**
 * Submit a ChaskaMeter rating for a TV show. Requires auth.
 * One vote per user per show — backend enforces.
 *
 * @param {number} showId
 * @param {object} args
 * @param {number} args.rating   integer 1–5
 */
export function rateShow(showId, { rating }) {
  return api.post(`${BASE}/${showId}/rate`, { rate: rating });
}
