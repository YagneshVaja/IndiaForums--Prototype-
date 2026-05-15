import { apiClient } from './api';

// ---------------------------------------------------------------------------
// DTOs — mirror the Smart Search OpenAPI schemas exactly.
// ---------------------------------------------------------------------------

export interface SmartSearchItemDto {
  itemId: number;
  title: string;
  pageUrl: string | null;
  updateChecksum: string | null;
  thumbnailUrl: string | null;
  contentType: string;
}

export interface SmartSearchSectionDto {
  section: string;
  contentTypeId: number;
  items: SmartSearchItemDto[];
}

export interface SmartTrendingItemDto {
  query: string;
  searchCount: number;
}

export interface SmartSearchResponseDto {
  query: string;
  contentTypeId: number;
  sections: SmartSearchSectionDto[];
  trendingSearches: SmartTrendingItemDto[];
}

export interface SmartSearchParams {
  query?: string;
  contentTypeId?: number;
}

/**
 * Smart search — single endpoint that powers typeahead, full results, and
 * trending. No query → trending-only. Query + contentTypeId=0 → up to 3 items
 * per section across all types. Query + contentTypeId 1–9 → only that section.
 */
export async function smart(
  { query, contentTypeId = 0 }: SmartSearchParams = {},
  signal?: AbortSignal,
): Promise<SmartSearchResponseDto> {
  const q = (query ?? '').trim();
  const res = await apiClient.get<SmartSearchResponseDto>('/search/smart', {
    params: {
      ...(q ? { query: q } : {}),
      contentTypeId,
    },
    signal,
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Legacy /search/results — kept for forum-name lookup in ForumListView.
// /search/smart does not return Forum results, so we still need this endpoint
// for that one consumer until forums get their own search API.
// ---------------------------------------------------------------------------

export interface LegacySearchResultItemDto {
  entityType: string;
  entityId: number;
  title: string;
  summary: string | null;
  url: string | null;
  imageUrl: string | null;
  score: number;
}

export interface LegacySearchResultsResponseDto {
  query: string;
  searchLogId: number | null;
  results: LegacySearchResultItemDto[];
}

export interface LegacySearchResultsParams {
  q: string;
  entityType?: string | null;
  page?: number;
  pageSize?: number;
}

export async function searchResults(
  { q, entityType, page = 1, pageSize = 50 }: LegacySearchResultsParams,
  signal?: AbortSignal,
): Promise<LegacySearchResultsResponseDto> {
  const trimmed = q.trim();
  if (!trimmed) return { query: '', searchLogId: null, results: [] };
  const res = await apiClient.get<LegacySearchResultsResponseDto>('/search/results', {
    params: {
      q: trimmed,
      ...(entityType ? { entityType } : {}),
      page,
      pageSize,
    },
    signal,
  });
  return res.data;
}
