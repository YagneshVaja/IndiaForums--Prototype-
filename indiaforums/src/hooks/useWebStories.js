import { useState, useEffect, useCallback, useRef } from 'react';
import * as webStoriesApi from '../services/webStoriesApi';
import { extractApiError } from '../services/api';
import { transformWebStory } from '../components/stories/normalize';

// ── Envelope helpers ─────────────────────────────────────────────────────────
//
// Real shape verified live on 2026-04-08 against api2.indiaforums.com:
//
//   { data: WebStory[], totalCount: 95 }
//
// Note: `data` is a flat array, NOT `{ webStories: [...] }`. The endpoint
// returns `totalCount` instead of a `pagination` object — we synthesise the
// pagination metadata client-side from totalCount + the requested pageSize.

function unwrapList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.webStories)) return payload.data.webStories;
  if (Array.isArray(payload?.webStories)) return payload.webStories;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

/**
 * Build a pagination object from `{ totalCount }` (real) or `{ pagination }`
 * (legacy/other endpoints), so the UI can rely on a single shape.
 */
function buildPagination(payload, currentPage, pageSize) {
  if (payload?.pagination && typeof payload.pagination === 'object') {
    return payload.pagination;
  }
  const totalCount = Number(payload?.totalCount) || 0;
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;
  return {
    currentPage,
    pageSize,
    totalItems: totalCount,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

/**
 * useWebStories — paginated list of web stories.
 *
 * Returns normalised stories (use `.id`, `.title`, `.coverImage`, etc., not
 * raw API field names). Call `loadMore()` to append the next page, or
 * `refresh()` to reset to page 1.
 *
 * @param {object} [initialParams]
 * @param {number} [initialParams.pageSize=24]
 * @param {string|number} [initialParams.categoryId]
 */
export default function useWebStories(initialParams = {}) {
  const [stories, setStories]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [params, setParams]         = useState(initialParams);
  const [page, setPage]             = useState(1);
  const loadingRef = useRef(false);

  const load = useCallback(async (pageNum, replace) => {
    if (!replace && loadingRef.current) return;
    loadingRef.current = true;
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const pageSize = params.pageSize || 24;
      const res = await webStoriesApi.getWebStories({
        ...params,
        page: pageNum,
        pageSize,
      });
      const items = unwrapList(res.data).map(transformWebStory).filter(Boolean);
      setStories(prev => (replace ? items : [...prev, ...items]));
      setPagination(buildPagination(res.data, pageNum, pageSize));
    } catch (err) {
      setError(extractApiError(err, 'Failed to load web stories'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [params]);

  // Reset to page 1 whenever filter params change.
  useEffect(() => {
    setPage(1);
    load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loadingRef.current) {
      const next = page + 1;
      setPage(next);
      load(next, false);
    }
  }, [pagination, page, load]);

  const refresh = useCallback(() => {
    setPage(1);
    load(1, true);
  }, [load]);

  return {
    stories,
    pagination,
    loading,
    error,
    params,
    setParams,
    loadMore,
    refresh,
  };
}
