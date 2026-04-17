import api from './api';

// ── Quizzes API ──────────────────────────────────────────────────────────────

const BASE = '/quizzes';

/**
 * Paginated quiz list.
 */
export function getQuizzes({ page = 1, pageSize = 20 } = {}) {
  return api.get(BASE, { params: { pageNumber: page, pageSize } });
}

/**
 * Full quiz detail including questions.
 */
export function getQuizDetails(quizId: number | string) {
  return api.get(`${BASE}/${quizId}/details`);
}

/**
 * Quiz leaderboard / player list.
 */
export function getQuizPlayers(quizId: number | string, { page = 1, pageSize = 20 } = {}) {
  return api.get(`${BASE}/${quizId}/players`, { params: { page, pageSize } });
}

/**
 * Top quiz creators.
 */
export function getQuizCreators({ page = 1, pageSize = 20 } = {}) {
  return api.get(`${BASE}/creators`, { params: { page, pageSize } });
}

/**
 * Submit quiz answers.
 */
export function submitQuizResponse(quizId: number | string, answers: any) {
  return api.post(`${BASE}/${quizId}/response`, { answers });
}
