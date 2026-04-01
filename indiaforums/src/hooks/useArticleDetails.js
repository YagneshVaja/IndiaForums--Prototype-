import { useState, useEffect } from 'react';
import { fetchArticleDetails } from '../services/api';

export default function useArticleDetails(articleId) {
  const [details, setDetails]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!articleId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchArticleDetails(articleId)
      .then(data => { if (!cancelled) setDetails(data); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load article'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [articleId]);

  return { details, loading, error };
}
