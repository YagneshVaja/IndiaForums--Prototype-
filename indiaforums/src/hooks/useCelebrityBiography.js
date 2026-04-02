import { useState, useEffect } from 'react';
import { fetchCelebrityBiography } from '../services/api';

export default function useCelebrityBiography(personId) {
  const [biography, setBiography] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!personId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBiography(null);

    (async () => {
      try {
        const result = await fetchCelebrityBiography(personId);
        if (!cancelled) setBiography(result);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load biography');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [personId]);

  return { biography, loading, error };
}
