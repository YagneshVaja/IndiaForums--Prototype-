import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchForumCategories, fetchForumList } from '../services/api';

const PAGE_SIZE = 20;

export default function useForumHome(categoryId = null) {
  // Categories (loaded once)
  const [categories, setCategories] = useState([]);
  const [subCatMap, setSubCatMap]   = useState({});
  const [catsLoaded, setCatsLoaded] = useState(false);

  // Forums (refetched per category)
  const [forums, setForums]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState(null);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const prevCatRef = useRef(categoryId);

  // Load categories once
  useEffect(() => {
    if (catsLoaded) return;
    (async () => {
      try {
        const result = await fetchForumCategories();
        setCategories(result.categories);
        setSubCatMap(result.subCatMap);
        setCatsLoaded(true);
      } catch (err) {
        setError(err.message || 'Failed to load categories');
      }
    })();
  }, [catsLoaded]);

  // Load forums when categoryId changes
  useEffect(() => {
    const catChanged = prevCatRef.current !== categoryId;
    prevCatRef.current = categoryId;

    if (catChanged) {
      setForums([]);
      setPage(1);
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchForumList(categoryId, 1, PAGE_SIZE);
        if (cancelled) return;
        setForums(result.forums);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalForumCount);
        setPage(1);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load forums');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [categoryId]);

  // Load more
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = await fetchForumList(categoryId, nextPage, PAGE_SIZE);
      setForums(prev => [...prev, ...result.forums]);
      setPage(nextPage);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err.message || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [categoryId, page, totalPages, loadingMore]);

  // Refresh current view
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!catsLoaded) {
        const cats = await fetchForumCategories();
        setCategories(cats.categories);
        setSubCatMap(cats.subCatMap);
        setCatsLoaded(true);
      }
      const result = await fetchForumList(categoryId, 1, PAGE_SIZE);
      setForums(result.forums);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalForumCount);
      setPage(1);
    } catch (err) {
      setError(err.message || 'Failed to load forums');
    } finally {
      setLoading(false);
    }
  }, [categoryId, catsLoaded]);

  const hasMore = page < totalPages;

  return {
    categories, subCatMap, forums, totalCount,
    loading, loadingMore, error, hasMore,
    loadMore, refresh,
  };
}
