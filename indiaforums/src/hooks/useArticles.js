import { useState, useEffect, useCallback } from 'react';
import { fetchArticles } from '../services/api';

export default function useArticles() {
  const [articles, setArticles]       = useState([]);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [page, setPage]               = useState(1);

  const load = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchArticles(pageNum);
      setArticles(prev => pageNum === 1 ? result.articles : [...prev, ...result.articles]);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loading) {
      const next = page + 1;
      setPage(next);
      load(next);
    }
  }, [pagination, loading, page, load]);

  const refresh = useCallback(() => {
    setPage(1);
    load(1);
  }, [load]);

  return { articles, pagination, loading, error, loadMore, refresh };
}
