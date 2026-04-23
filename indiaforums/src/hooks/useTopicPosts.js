import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTopicPosts } from '../services/api';

export default function useTopicPosts(topicId) {
  const [posts, setPosts]               = useState([]);
  const [topicDetail, setTopicDetail]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error, setError]               = useState(null);
  const [hasMore, setHasMore]           = useState(false);
  const [page, setPage]                 = useState(1);

  // Monotonic request id — any response whose id != activeRequestId.current
  // is stale (fired for a previous topicId or page) and must be discarded.
  // Without this, rapidly switching topics can let the old topic's posts
  // overwrite the new topic's state when it resolves late.
  const activeRequestId = useRef(0);

  const load = useCallback(async (pageNum, replace = false) => {
    const reqId = ++activeRequestId.current;
    if (replace) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchTopicPosts(topicId, pageNum, 20);
      if (reqId !== activeRequestId.current) return;
      setPosts(prev => replace ? result.posts : [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      if (result.topicDetail) setTopicDetail(result.topicDetail);
    } catch (err) {
      if (reqId !== activeRequestId.current) return;
      setError(err.message || 'Failed to load posts');
    } finally {
      if (reqId === activeRequestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [topicId]);

  useEffect(() => {
    if (!topicId) return;
    activeRequestId.current++;
    setPage(1);
    setPosts([]);
    setHasMore(false);
    setTopicDetail(null);
    load(1, true);
  }, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return { posts, topicDetail, loading, loadingMore, error, hasMore, loadMore, refresh };
}
