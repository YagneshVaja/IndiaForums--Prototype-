import { useState, useEffect, useCallback } from 'react';
import { fetchMediaGalleries } from '../services/api';

export default function useMediaGalleries(categoryId = null) {
  const [galleries, setGalleries]     = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState(null);
  const [page, setPage]               = useState(1);

  const load = useCallback(async (pageNum, replace = false) => {
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchMediaGalleries(pageNum, 25, categoryId);
      setGalleries(prev => replace ? result.galleries : [...prev, ...result.galleries]);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load galleries');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryId]);

  // Reset and re-fetch from page 1 whenever categoryId changes
  useEffect(() => {
    setPage(1);
    setGalleries([]);
    setPagination(null);
    load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loading && !loadingMore) {
      const next = page + 1;
      setPage(next);
      setLoadingMore(true);
      load(next, false);
    }
  }, [pagination, loading, loadingMore, page, load]);

  const refresh = useCallback(() => {
    setPage(1);
    load(1, true);
  }, [load]);

  return { galleries, pagination, loading, loadingMore, error, loadMore, refresh };
}
