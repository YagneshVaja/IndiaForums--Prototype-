import { apiClient } from './api';

// ---------------------------------------------------------------------------
// DTOs — mirror the Smart Search OpenAPI schemas exactly.
// ---------------------------------------------------------------------------

export interface SuggestItemDto {
  phrase: string;
  entityType: string | null;
  entityId: number | null;
  url: string | null;
  imageUrl: string | null;
  weight: number;
}

export interface SuggestResponseDto {
  query: string;
  suggestions: SuggestItemDto[];
}

export interface SearchResultItemDto {
  entityType: string;
  entityId: number;
  title: string;
  summary: string | null;
  url: string | null;
  imageUrl: string | null;
  score: number;
}

export interface SearchResultsResponseDto {
  query: string;
  searchLogId: number | null;
  results: SearchResultItemDto[];
}

export interface TrackSearchClickResponseDto {
  success: boolean;
  suggestionLearned: boolean;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Fast typeahead. No logging server-side. Returns up to 10 weight-ordered
 * suggestions. Pass the AbortSignal so older requests are cancelled when
 * the user keeps typing.
 */
export async function suggest(
  q: string,
  signal?: AbortSignal,
): Promise<SuggestResponseDto> {
  const trimmed = q.trim();
  if (!trimmed) return { query: '', suggestions: [] };
  const res = await apiClient.get<SuggestResponseDto>('/search/suggest', {
    params: { q: trimmed },
    signal,
  });
  return res.data;
}

export interface SearchResultsParams {
  q: string;
  entityType?: string | null;
  page?: number;
  pageSize?: number;
}

/**
 * Full scored results. Returns up to 50 items + a `searchLogId` used by
 * `trackClick` for learning. Live API currently returns the same payload
 * for page 1 and page 2 — we still send `page` so this client doesn't
 * need restructuring once pagination is fixed server-side.
 */
export async function searchResults(
  { q, entityType, page = 1, pageSize = 50 }: SearchResultsParams,
  signal?: AbortSignal,
): Promise<SearchResultsResponseDto> {
  const trimmed = q.trim();
  if (!trimmed) return { query: '', searchLogId: null, results: [] };
  const res = await apiClient.get<SearchResultsResponseDto>('/search/results', {
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

export interface TrackSearchClickArgs {
  searchLogId: number;
  entityType: string;
  entityId: number;
}

/**
 * Fire-and-forget click tracker. Caller does not await this — search
 * navigation must feel instant.
 */
export async function trackClick(
  args: TrackSearchClickArgs,
): Promise<TrackSearchClickResponseDto | null> {
  try {
    const res = await apiClient.post<TrackSearchClickResponseDto>(
      '/search/click',
      args,
    );
    return res.data;
  } catch {
    // Click tracking is best-effort. Swallow.
    return null;
  }
}
