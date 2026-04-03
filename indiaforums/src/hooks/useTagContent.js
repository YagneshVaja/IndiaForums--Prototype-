import { useState, useEffect, useCallback } from 'react';
import { fetchTagArticles, fetchTagVideos, fetchTagGalleries } from '../services/api';

export default function useTagContent(contentType, contentId) {
  const [articles, setArticles]     = useState([]);
  const [videos, setVideos]         = useState([]);
  const [galleries, setGalleries]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [articlePage, setArticlePage] = useState(1);
  const [hasMoreArticles, setHasMoreArticles] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!contentType || !contentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchTagArticles(contentType, contentId, 1, 20),
      fetchTagVideos(contentType, contentId, 1, 10),
      fetchTagGalleries(contentType, contentId, 1, 10),
    ])
      .then(([artResult, vidResult, galResult]) => {
        if (cancelled) return;
        setArticles(artResult.articles);
        setHasMoreArticles(artResult.pagination?.hasNextPage ?? false);
        setVideos(vidResult.videos);
        setGalleries(galResult.galleries);
        setArticlePage(1);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load content');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [contentType, contentId]);

  const loadMoreArticles = useCallback(async () => {
    if (loadingMore || !hasMoreArticles) return;
    setLoadingMore(true);
    try {
      const next = articlePage + 1;
      const result = await fetchTagArticles(contentType, contentId, next, 20);
      setArticles(prev => [...prev, ...result.articles]);
      setHasMoreArticles(result.pagination?.hasNextPage ?? false);
      setArticlePage(next);
    } catch (_) { /* swallow */ }
    finally { setLoadingMore(false); }
  }, [contentType, contentId, articlePage, loadingMore, hasMoreArticles]);

  return { articles, videos, galleries, loading, error, loadMoreArticles, hasMoreArticles, loadingMore };
}
