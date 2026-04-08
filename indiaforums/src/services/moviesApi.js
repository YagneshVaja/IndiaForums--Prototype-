import api from './api';

// ── Movies API ───────────────────────────────────────────────────────────────
// Routes (per OpenAPI spec, audited Phase 7 — 2026-04-07):
//   GET    /movies                              — list (mode: latest|upcoming)
//   GET    /movies/by-mode                      — filtered list (mode codes 0/3/30/51/100/101)
//   GET    /movies/year/{year}                  — by release year
//   GET    /movies/{titleId}/story              — movie details + plot
//   GET    /movies/{titleId}/cast               — cast & crew
//   GET    /movies/{titleId}/fanclub            — fan list
//   GET    /movies/{titleId}/reviews            — critic + user reviews
//   POST   /movies/{titleId}/reviews            — add user review (auth)
//   PUT    /movies/{titleId}/reviews/{reviewId} — update own review (auth)
//   DELETE /movies/{titleId}/reviews/{reviewId} — delete own review (auth)
//
// All read endpoints verified working with real titleIds (e.g. 7412 = "Tu Yaa Main").
// Probing with titleId=1 returns 500 instead of 404 — minor backend rough edge,
// not a Phase 7 blocker. All write endpoints return clean 401 unauthenticated.

const BASE = '/movies';

// MoviesByMode mode codes (per spec description block):
export const MOVIES_BY_MODE = {
  PERSON:         3,    // movies associated with a person (all roles)
  PERSON_BY_ROLE: 30,   // movies by person + specific roleId
  USER:           51,   // a user's favourite movies (legacy mode)
  CATEGORY:       0,    // movies in a category
  LATEST:         100,
  UPCOMING:       101,
};

/* ── Read ──────────────────────────────────────────────────────────────── */

/**
 * Get a paginated list of movies by simple mode.
 *
 * @param {object} [args]
 * @param {'latest'|'upcoming'} [args.mode='latest']
 * @param {number} [args.page=1]
 * @param {number} [args.pageSize=24]
 */
export function getMovies({ mode = 'latest', page = 1, pageSize = 24 } = {}) {
  return api.get(BASE, { params: { mode, page, pageSize } });
}

/**
 * Get movies by advanced mode (Person, PersonByRole, User, Category, Latest, Upcoming).
 *
 * @param {object} args
 * @param {number}  args.mode      one of MOVIES_BY_MODE.*
 * @param {number}  [args.id]      personId / userId / categoryId depending on mode
 * @param {number}  [args.roleId]  required when mode = PERSON_BY_ROLE
 * @param {number}  [args.page=1]
 * @param {number}  [args.pageSize=24]
 */
export function getMoviesByMode({ mode, id, roleId, page = 1, pageSize = 24 }) {
  const params = { mode, page, pageSize };
  if (id !== undefined && id !== null)         params.id     = id;
  if (roleId !== undefined && roleId !== null) params.roleId = roleId;
  return api.get(`${BASE}/by-mode`, { params });
}

/**
 * Get movies released in a specific year (1933 → current).
 */
export function getMoviesByYear(year, { page = 1, pageSize = 20 } = {}) {
  return api.get(`${BASE}/year/${year}`, { params: { page, pageSize } });
}

/**
 * Get a movie's details and story/plot info.
 */
export function getMovieStory(titleId) {
  return api.get(`${BASE}/${titleId}/story`);
}

/**
 * Get a movie's cast & crew (paginated).
 */
export function getMovieCast(titleId, { page = 1, pageSize = 24 } = {}) {
  return api.get(`${BASE}/${titleId}/cast`, { params: { page, pageSize } });
}

/**
 * Get a movie's fanclub members.
 *
 * @param {number} titleId
 * @param {object} [args]
 * @param {number} [args.userId]   if set, also reports whether this user is a fan
 */
export function getMovieFanclub(titleId, { page = 1, pageSize = 72, userId } = {}) {
  const params = { page, pageSize };
  if (userId) params.userId = userId;
  return api.get(`${BASE}/${titleId}/fanclub`, { params });
}

/**
 * Get critic + user reviews for a movie.
 * Both critic and user lists paginate independently.
 */
export function getMovieReviews(titleId, {
  criticPage = 1, criticPageSize = 30,
  userPage = 1, userPageSize = 30,
} = {}) {
  return api.get(`${BASE}/${titleId}/reviews`, {
    params: { criticPage, criticPageSize, userPage, userPageSize },
  });
}

/* ── Write (auth required) ─────────────────────────────────────────────── */

/**
 * Submit a new user review for a movie.
 *
 * @param {number} titleId
 * @param {object} args
 * @param {number}  args.rating          1–10 per legacy convention (the spec
 *                                       leaves the range open; backend clamps)
 * @param {string}  [args.subject]       optional review headline
 * @param {string}  [args.review]        the body of the review
 */
export function addMovieReview(titleId, { rating, subject, review }) {
  const body = { titleId, rating };
  if (subject) body.subject = subject;
  if (review)  body.review  = review;
  return api.post(`${BASE}/${titleId}/reviews`, body);
}

/**
 * Update a movie review the current user owns (admins can edit any).
 *
 * @param {number} titleId
 * @param {number} reviewId
 * @param {object} args
 * @param {number}  args.rating
 * @param {string}  [args.subject]
 * @param {string}  [args.review]
 */
export function updateMovieReview(titleId, reviewId, { rating, subject, review }) {
  const body = { titleId, reviewId, rating };
  if (subject) body.subject = subject;
  if (review)  body.review  = review;
  return api.put(`${BASE}/${titleId}/reviews/${reviewId}`, body);
}

/**
 * Delete a movie review the current user owns (admins can delete any).
 */
export function deleteMovieReview(titleId, reviewId) {
  return api.delete(`${BASE}/${titleId}/reviews/${reviewId}`);
}
