import api from './api';

// ── Quizzes API ──────────────────────────────────────────────────────────────
// Endpoints (field names are assumed — verify against live API once available):
//
//   GET  /quizzes                       — paginated quiz list
//   GET  /quizzes/{quizId}/details      — quiz questions + metadata
//   GET  /quizzes/{quizId}/players      — leaderboard / players
//   GET  /quizzes/creators              — top quiz creators
//   POST /quizzes/{quizId}/response     — submit answers
//
// See docs/superpowers/specs/2026-04-08-quizzes-api-integration-design.md §7
// for full list of field-name assumptions.

const BASE = '/quizzes';

/**
 * Paginated quiz list.
 * Assumed response: { quizzes: Quiz[] } or { data: { quizzes: Quiz[] }, pagination: {...} }
 */
export function getQuizzes({ page = 1, pageSize = 20 } = {}) {
  return api.get(BASE, { params: { page, pageSize } });
}

/**
 * Full quiz detail including questions.
 * Assumed response: quiz object with `questions` array.
 */
export function getQuizDetails(quizId) {
  return api.get(`${BASE}/${quizId}/details`);
}

/**
 * Quiz leaderboard / player list.
 * Assumed response: { players: Player[] }
 */
export function getQuizPlayers(quizId, { page = 1, pageSize = 20 } = {}) {
  return api.get(`${BASE}/${quizId}/players`, { params: { page, pageSize } });
}

/**
 * Top quiz creators.
 * Assumed response: { creators: Creator[] }
 */
export function getQuizCreators({ page = 1, pageSize = 20 } = {}) {
  return api.get(`${BASE}/creators`, { params: { page, pageSize } });
}

/**
 * Submit quiz answers.
 * Assumed payload: { answers: [{ questionId, selectedOptionIndex }] }
 * Assumed response: { score, totalQuestions, rank }
 * Verify both shapes against live API — see Assumptions A4/A5 in design spec.
 */
export function submitQuizResponse(quizId, answers) {
  return api.post(`${BASE}/${quizId}/response`, { answers });
}
