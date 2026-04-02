import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCelebrityFans } from '../services/api';

export default function useCelebrityFans(personId, pageSize = 20) {
  const [fans, setFans]             = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [page, setPage]             = useState(1);
  const loadingRef = useRef(false);

  const load = useCallback(async (pageNum, replace = false) => {
    if (!personId) return;
    if (!replace && loadingRef.current) return;
    loadingRef.current = true;
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchCelebrityFans(personId, pageNum, pageSize);
      setFans(prev => replace ? result.fans : [...prev, ...result.fans]);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load fans');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [personId, pageSize]);

  useEffect(() => {
    if (!personId) return;
    setPage(1);
    load(1, true);
  }, [load, personId]);

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

  return { fans, pagination, loading, error, loadMore, refresh };
}
