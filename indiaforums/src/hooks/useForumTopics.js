import { useState, useEffect, useCallback } from 'react';
import { fetchForumTopics } from '../services/api';

export default function useForumTopics(forumId, sortBy = 'latest') {
  const [topics, setTopics]           = useState([]);
  const [forumDetail, setForumDetail] = useState(null);
  const [flairs, setFlairs]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState(null);
  const [cursor, setCursor]           = useState(null);
  const [hasMore, setHasMore]         = useState(false);
  const [page, setPage]               = useState(1);

  const load = useCallback(async (pageNum, replace = false, currentCursor = null) => {
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchForumTopics(forumId, pageNum, 20, replace ? null : currentCursor, sortBy);
      setTopics(prev => replace ? result.topics : [...prev, ...result.topics]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
      if (result.forumDetail) setForumDetail(result.forumDetail);
      if (result.flairs?.length) setFlairs(result.flairs);
    } catch (err) {
      setError(err.message || 'Failed to load topics');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [forumId, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset and fetch when forumId or sortBy changes
  useEffect(() => {
    if (!forumId) return;
    setPage(1);
    setTopics([]);
    setCursor(null);
    setHasMore(false);
    setForumDetail(null);
    setFlairs([]);
    load(1, true);
  }, [forumId, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      const next = page + 1;
      setPage(next);
      setLoadingMore(true);
      load(next, false, cursor);
    }
  }, [hasMore, loading, loadingMore, page, cursor, load]);

  const refresh = useCallback(() => {
    setPage(1);
    setCursor(null);
    load(1, true);
  }, [load]);

  return { topics, forumDetail, flairs, loading, loadingMore, error, hasMore, loadMore, refresh };
}
