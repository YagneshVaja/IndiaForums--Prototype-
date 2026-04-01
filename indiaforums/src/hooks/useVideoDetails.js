import { useState, useEffect } from 'react';
import { fetchVideoDetails } from '../services/api';

export default function useVideoDetails(videoId) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchVideoDetails(videoId)
      .then(data => { if (!cancelled) setDetails(data); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load video'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [videoId]);

  return { details, loading, error };
}
