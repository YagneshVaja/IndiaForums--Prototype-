import { useState, useEffect, useCallback } from 'react';
import { fetchAllForumTopics } from '../services/api';

export default function useAllForumTopics() {
  const [topics, setTopics]           = useState([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState(null);
  const [hasMore, setHasMore]         = useState(false);
  const [page, setPage]               = useState(1);

  const load = useCallback(async (pageNum, replace = false) => {
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchAllForumTopics(pageNum, 20);
      setTopics(prev => replace ? result.topics : [...prev, ...result.topics]);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err.message || 'Failed to load topics');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      const next = page + 1;
      setPage(next);
      setLoadingMore(true);
      load(next, false);
    }
  }, [hasMore, loading, loadingMore, page, load]);

  const refresh = useCallback(() => {
    setPage(1);
    load(1, true);
  }, [load]);

  return { topics, totalCount, loading, loadingMore, error, hasMore, loadMore, refresh };
}
