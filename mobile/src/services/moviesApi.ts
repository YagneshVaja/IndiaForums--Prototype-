import api from './api';

// ── Movies API ───────────────────────────────────────────────────────────────

const BASE = '/movies';

// MoviesByMode mode codes (per spec description block):
export const MOVIES_BY_MODE = {
  PERSON:         3,
  PERSON_BY_ROLE: 30,
  USER:           51,
  CATEGORY:       0,
  LATEST:         100,
  UPCOMING:       101,
};

/* ── Read ──────────────────────────────────────────────────────────────── */

/**
 * Get a paginated list of movies by simple mode.
 */
export function getMovies({ mode = 'latest', page = 1, pageSize = 24 }: {
  mode?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  return api.get(BASE, { params: { mode, page, pageSize } });
}

/**
 * Get movies by advanced mode (Person, PersonByRole, User, Category, Latest, Upcoming).
 */
export function getMoviesByMode({ mode, id, roleId, page = 1, pageSize = 24 }: {
  mode: number;
  id?: number;
  roleId?: number;
  page?: number;
  pageSize?: number;
}) {
  const params: any = { mode, page, pageSize };
  if (id !== undefined && id !== null)         params.id     = id;
  if (roleId !== undefined && roleId !== null) params.roleId = roleId;
  return api.get(`${BASE}/by-mode`, { params });
}

/**
 * Get movies released in a specific year.
 */
export function getMoviesByYear(year: number, { page = 1, pageSize = 20 } = {}) {
  return api.get(`${BASE}/year/${year}`, { params: { page, pageSize } });
}

/**
 * Get a movie's details and story/plot info.
 */
export function getMovieStory(titleId: number | string) {
  return api.get(`${BASE}/${titleId}/story`);
}

/**
 * Get a movie's cast & crew (paginated).
 */
export function getMovieCast(titleId: number | string, { page = 1, pageSize = 24 } = {}) {
  return api.get(`${BASE}/${titleId}/cast`, { params: { page, pageSize } });
}

/**
 * Get a movie's fanclub members.
 */
export function getMovieFanclub(titleId: number | string, { page = 1, pageSize = 72, userId }: {
  page?: number;
  pageSize?: number;
  userId?: number;
} = {}) {
  const params: any = { page, pageSize };
  if (userId) params.userId = userId;
  return api.get(`${BASE}/${titleId}/fanclub`, { params });
}

/**
 * Get critic + user reviews for a movie.
 */
export function getMovieReviews(titleId: number | string, {
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
 */
export function addMovieReview(titleId: number | string, { rating, subject, review }: {
  rating: number;
  subject?: string;
  review?: string;
}) {
  const body: any = { titleId, rating };
  if (subject) body.subject = subject;
  if (review)  body.review  = review;
  return api.post(`${BASE}/${titleId}/reviews`, body);
}

/**
 * Update a movie review the current user owns.
 */
export function updateMovieReview(titleId: number | string, reviewId: number | string, { rating, subject, review }: {
  rating: number;
  subject?: string;
  review?: string;
}) {
  const body: any = { titleId, reviewId, rating };
  if (subject) body.subject = subject;
  if (review)  body.review  = review;
  return api.put(`${BASE}/${titleId}/reviews/${reviewId}`, body);
}

/**
 * Delete a movie review the current user owns.
 */
export function deleteMovieReview(titleId: number | string, reviewId: number | string) {
  return api.delete(`${BASE}/${titleId}/reviews/${reviewId}`);
}
