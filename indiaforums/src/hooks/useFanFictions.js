import { useState, useEffect, useCallback, useRef } from 'react';
import * as ffApi from '../services/fanFictionsApi';
import { extractApiError } from '../services/api';

// ── Envelope helpers ─────────────────────────────────────────────────────────
//
// Real API shapes (confirmed against https://api2.indiaforums.com on 2026-04-07):
//
//   GET /fan-fictions          → { data: { fanFictions: [...] }, pagination: {...} }
//   GET /fan-fictions/{id}     → { fanFiction: {...}, chapters: [...] }    ← flat, no data wrapper
//   GET /fan-fictions/chapter/{chapterId} → chapter object at the top level
//
// `pagination` is a TOP-LEVEL sibling of `data` — NOT nested inside data.
// Multiple shapes are handled so this still works if the backend ever
// standardises on a different envelope.

function unwrapList(data, ...keys) {
  if (!data) return [];
  const root = data?.data || data;
  for (const key of keys) {
    if (Array.isArray(root?.[key])) return root[key];
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(root?.items))   return root.items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root))          return root;
  return [];
}

function unwrapPagination(data) {
  // Pagination is TOP-LEVEL — not inside data.
  return data?.pagination || null;
}

function unwrapObject(data, ...keys) {
  if (!data) return null;
  // Detail endpoint is flat: { fanFiction: {...}, chapters: [...] }
  for (const key of keys) {
    if (data?.[key] && typeof data[key] === 'object') return data[key];
  }
  const root = data?.data || data;
  for (const key of keys) {
    if (root?.[key] && typeof root[key] === 'object') return root[key];
  }
  return root;
}

// ── 1. Paginated story list ──────────────────────────────────────────────────
export function useFanFictionList(initialParams = {}) {
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
      const res = await ffApi.getFanFictions({
        ...params,
        page: pageNum,
        pageSize: params.pageSize || 20,
      });
      const items = unwrapList(res.data, 'fanFictions');
      setStories(prev => (replace ? items : [...prev, ...items]));
      setPagination(unwrapPagination(res.data));
    } catch (err) {
      setError(extractApiError(err, 'Failed to load fan fictions'));
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

// ── 2. Single fan fiction detail ─────────────────────────────────────────────
// Returns both the story object and the chapter list separately — the detail
// endpoint returns them as siblings, not nested: { fanFiction, chapters }.
export function useFanFictionDetail(id) {
  const [story, setStory]       = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ffApi.getFanFictionDetail(id);
      setStory(unwrapObject(res.data, 'fanFiction', 'story'));
      setChapters(unwrapList(res.data, 'chapters'));
    } catch (err) {
      setError(extractApiError(err, 'Failed to load story'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { story, chapters, loading, error, refetch: fetch };
}

// ── 3. Single chapter body ───────────────────────────────────────────────────
// Chapter endpoint returns a flat object at the top level.
export function useFanFictionChapter(chapterId) {
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ffApi.getFanFictionChapter(chapterId);
      // Flat response: chapterId/chapterTitle/chapterContent at top level.
      setChapter(res.data || null);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load chapter'));
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { chapter, loading, error, refetch: fetch };
}

// ── 4. Top authors leaderboard ───────────────────────────────────────────────
// NOTE (2026-04-07): `/fan-fictions/authors` currently returns HTTP 500
// server-side. The hook still surfaces the error cleanly; the UI shows a
// bug-state banner. See docs/backend-issues-2026-04-07.md.
export function useFanFictionAuthors(initialParams = {}) {
  const [authors, setAuthors]       = useState([]);
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
      const res = await ffApi.getFanFictionAuthors({
        ...params,
        page: pageNum,
        pageSize: params.pageSize || 20,
      });
      const items = unwrapList(res.data, 'authors', 'users');
      setAuthors(prev => (replace ? items : [...prev, ...items]));
      setPagination(unwrapPagination(res.data));
    } catch (err) {
      setError(extractApiError(err, 'Failed to load authors'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [params]);

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

  return { authors, pagination, loading, error, params, setParams, loadMore };
}

// ── 5. Followers of a single author ──────────────────────────────────────────
// NOTE (2026-04-07): `/fan-fictions/author/{id}/followers` currently returns
// HTTP 400 server-side regardless of params. See backend-issues doc.
export function useFanFictionAuthorFollowers(authorId, pageSize = 24) {
  const [followers, setFollowers]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [page, setPage]             = useState(1);
  const loadingRef = useRef(false);

  const load = useCallback(async (pageNum, replace) => {
    if (!authorId) return;
    if (!replace && loadingRef.current) return;
    loadingRef.current = true;
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await ffApi.getFanFictionAuthorFollowers(authorId, {
        page: pageNum,
        pageSize,
      });
      const items = unwrapList(res.data, 'followers', 'users');
      setFollowers(prev => (replace ? items : [...prev, ...items]));
      setPagination(unwrapPagination(res.data));
    } catch (err) {
      setError(extractApiError(err, 'Failed to load followers'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [authorId, pageSize]);

  useEffect(() => {
    if (!authorId) return;
    setPage(1);
    load(1, true);
  }, [authorId, load]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loadingRef.current) {
      const next = page + 1;
      setPage(next);
      load(next, false);
    }
  }, [pagination, page, load]);

  return { followers, pagination, loading, error, loadMore };
}
