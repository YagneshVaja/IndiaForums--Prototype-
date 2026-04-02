import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCelebrities } from '../services/api';

export default function useCelebrities(pageSize = 20) {
  const [categories, setCategories]     = useState({});
  const [celebrities, setCelebrities]   = useState([]);
  const [rankDates, setRankDates]       = useState({ start: '', end: '' });
  const [pagination, setPagination]     = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (force = false) => {
    if (!force && loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCelebrities(1, pageSize);
      setCategories(result.categories);
      setCelebrities(result.celebrities);
      setRankDates({ start: result.rankStartDate, end: result.rankEndDate });
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load celebrities');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [pageSize]);

  useEffect(() => {
    load(true);
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return { categories, celebrities, rankDates, pagination, loading, error, refresh };
}
