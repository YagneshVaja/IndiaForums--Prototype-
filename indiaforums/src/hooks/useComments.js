import { useState, useEffect, useCallback } from 'react';
import { fetchComments } from '../services/api';

export default function useComments(contentTypeId, contentTypeValue) {
  const [comments, setComments]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [nextCursor, setNextCursor]   = useState(null);
  const [hasMore, setHasMore]         = useState(false);
  const [totalItems, setTotalItems]   = useState(0);

  // Initial fetch
  useEffect(() => {
    if (!contentTypeId || !contentTypeValue) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setComments([]);
    setNextCursor(null);

    fetchComments(contentTypeId, contentTypeValue)
      .then(({ comments: items, pagination }) => {
        if (cancelled) return;
        setComments(items);
        setNextCursor(pagination.nextCursor);
        setHasMore(pagination.hasNextPage);
        setTotalItems(pagination.totalItems);
      })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load comments'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [contentTypeId, contentTypeValue]);

  // Load more (cursor-based pagination)
  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor) return;

    fetchComments(contentTypeId, contentTypeValue, { cursor: nextCursor })
      .then(({ comments: items, pagination }) => {
        setComments(prev => [...prev, ...items]);
        setNextCursor(pagination.nextCursor);
        setHasMore(pagination.hasNextPage);
      })
      .catch(err => setError(err.message));
  }, [contentTypeId, contentTypeValue, hasMore, nextCursor]);

  return { comments, loading, error, hasMore, loadMore, totalItems };
}
