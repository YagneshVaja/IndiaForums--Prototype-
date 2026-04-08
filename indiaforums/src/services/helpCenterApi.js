import api from './api';

// ── Help Center API ──────────────────────────────────────────────────────────
// Routes (per OpenAPI spec, audited Phase 9 — 2026-04-07):
//   GET /helpcenter/home                  — categories + questionsByCategory + pendingQuestions
//   GET /helpcenter/questions             — filter by categoryId / searchQuery    ⚠ broken
//   GET /helpcenter/question/{questionId} — question details with answers
//   GET /helpcenter/topcontributors       — top contributors (by approved answers)
//
// Backend status:
//   - /helpcenter/home            — ✅ 200, returns all categories + questions in one shot
//   - /helpcenter/question/{id}   — ✅ 200, returns question + answers + related
//   - /helpcenter/topcontributors — ✅ 200, returns paginated contributor list
//   - /helpcenter/questions       — ⚠ 500 (Class D-3, see docs/backend-issues-2026-04-07.md).
//
// Since /helpcenter/home already returns every category + its questions in a
// single response, the HelpCenterScreen is fully buildable without the broken
// /questions filter endpoint. Browse works; search-by-text does not.

const BASE = '/helpcenter';

/**
 * Get Help Center home page data — categories + questions grouped by category
 * + paginated pending questions.
 *
 * Response shape:
 *   { categories: [{ id, name, icon, description, ... }],
 *     questionsByCategory: [{ categoryId, name, icon, questionId, question, status }],
 *     pendingQuestions: [...], totalCount, totalPages, ... }
 *
 * @param {object} [args]
 * @param {number} [args.pageNumber=1]
 * @param {number} [args.pageSize=10]
 */
export function getHelpCenterHome({ pageNumber = 1, pageSize = 10 } = {}) {
  return api.get(`${BASE}/home`, { params: { pageNumber, pageSize } });
}

/**
 * Filter Help Center questions by category or search query.
 *
 * ⚠ Backend currently returns 500 for every call (Class D-3). Prefer
 * `getHelpCenterHome` which returns `questionsByCategory` unfiltered.
 */
export function getHelpCenterQuestions({
  categoryId,
  searchQuery,
  pageNumber = 1,
  pageSize = 20,
} = {}) {
  const params = { pageNumber, pageSize };
  if (categoryId !== undefined && categoryId !== null) params.categoryId = categoryId;
  if (searchQuery) params.searchQuery = searchQuery;
  return api.get(`${BASE}/questions`, { params });
}

/**
 * Get a single Help Center question's details + answers + related questions.
 */
export function getHelpCenterQuestionDetail(questionId) {
  return api.get(`${BASE}/question/${questionId}`);
}

/**
 * Get paginated list of top contributors (users with most approved answers).
 */
export function getHelpCenterTopContributors({ pageNumber = 1, pageSize = 10 } = {}) {
  return api.get(`${BASE}/topcontributors`, { params: { pageNumber, pageSize } });
}
