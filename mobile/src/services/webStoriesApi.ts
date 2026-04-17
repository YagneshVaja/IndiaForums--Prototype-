import api from './api';

// ── WebStories API ───────────────────────────────────────────────────────────

const BASE = '/webstories';

/**
 * Get a paginated list of web stories.
 */
export function getWebStories({ page = 1, pageSize = 24, categoryId }: {
  page?: number;
  pageSize?: number;
  categoryId?: string | number;
} = {}) {
  const params: any = { page, pageSize };
  if (categoryId != null && categoryId !== 'all') params.categoryId = categoryId;
  return api.get(BASE, { params });
}

/**
 * Get full details for a single web story, including all slides.
 */
export function getWebStoryDetails(storyId: string | number) {
  return api.get(`${BASE}/${storyId}/details`);
}
