import { useState, useEffect, useCallback } from 'react';
import { fetchVideos } from '../services/api';

export default function useVideos(pageSize = 20, contentId = null) {
  const [videos, setVideos]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [page, setPage]           = useState(1);

  const load = useCallback(async (pageNum, replace = false) => {
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchVideos(pageNum, pageSize, contentId);
      setVideos(prev => replace ? result.videos : [...prev, ...result.videos]);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [pageSize, contentId]);

  // Refetch from page 1 when contentId changes
  useEffect(() => {
    setPage(1);
    load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (pagination?.hasNextPage && !loading) {
      const next = page + 1;
      setPage(next);
      load(next, false);
    }
  }, [pagination, loading, page, load]);

  const refresh = useCallback(() => {
    setPage(1);
    load(1, true);
  }, [load]);

  return { videos, pagination, loading, error, loadMore, refresh };
}
