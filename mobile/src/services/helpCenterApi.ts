import api from './api';

// ── Help Center API ──────────────────────────────────────────────────────────

const BASE = '/helpcenter';

/**
 * Get Help Center home page data — categories + questions grouped by category
 * + paginated pending questions.
 */
export function getHelpCenterHome({ pageNumber = 1, pageSize = 10 } = {}) {
  return api.get(`${BASE}/home`, { params: { pageNumber, pageSize } });
}

/**
 * Filter Help Center questions by category or search query.
 *
 * Backend currently returns 500 for every call. Prefer `getHelpCenterHome`.
 */
export function getHelpCenterQuestions({
  categoryId,
  searchQuery,
  pageNumber = 1,
  pageSize = 20,
}: {
  categoryId?: number;
  searchQuery?: string;
  pageNumber?: number;
  pageSize?: number;
} = {}) {
  const params: any = { pageNumber, pageSize };
  if (categoryId !== undefined && categoryId !== null) params.categoryId = categoryId;
  if (searchQuery) params.searchQuery = searchQuery;
  return api.get(`${BASE}/questions`, { params });
}

/**
 * Get a single Help Center question's details + answers + related questions.
 */
export function getHelpCenterQuestionDetail(questionId: number | string) {
  return api.get(`${BASE}/question/${questionId}`);
}

/**
 * Get paginated list of top contributors (users with most approved answers).
 */
export function getHelpCenterTopContributors({ pageNumber = 1, pageSize = 10 } = {}) {
  return api.get(`${BASE}/topcontributors`, { params: { pageNumber, pageSize } });
}
