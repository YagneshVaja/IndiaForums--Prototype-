import { useState, useEffect } from 'react';
import { fetchMediaGalleryDetails } from '../services/api';

export default function useMediaGalleryDetails(id) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMediaGalleryDetails(id)
      .then(data  => { if (!cancelled) setDetails(data); })
      .catch(err  => { if (!cancelled) setError(err.message || 'Failed to load gallery'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  return { details, loading, error };
}
