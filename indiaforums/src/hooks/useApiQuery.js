import { useState, useEffect, useCallback } from 'react';
import { extractApiError } from '../services/api';

/**
 * useApiQuery — minimal data-fetching hook to remove the loading/error/refetch
 * boilerplate that every list screen ends up writing.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApiQuery(
 *     () => activitiesApi.getMyActivities(),
 *     [],                              // deps
 *     { fallback: 'Failed to load activities' },
 *   );
 *
 * The fetcher is called with no arguments and must return an axios-style
 * promise resolving to { data: ... }. The unwrapped `res.data` is what gets
 * stored in `data`. If you need a different shape (e.g. to pull `items` out of
 * an envelope), pass a `select` function in options.
 *
 * @param {() => Promise<{data: any}>} fetcher
 * @param {any[]} deps                                 — fetcher is re-invoked when these change
 * @param {object} [options]
 * @param {string} [options.fallback='Failed to load']
 * @param {(data: any) => any} [options.select]       — transform res.data before storing
 * @param {boolean} [options.skip=false]              — when true, the fetch is not run
 * @param {any} [options.initialData=null]
 */
export default function useApiQuery(fetcher, deps = [], options = {}) {
  const {
    fallback = 'Failed to load',
    select,
    skip = false,
    initialData = null,
  } = options;

  const [data, setData]       = useState(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError]     = useState(null);

  const run = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      const payload = res?.data;
      setData(select ? select(payload) : payload);
    } catch (err) {
      setError(extractApiError(err, fallback));
    } finally {
      setLoading(false);
    }
    // The fetcher closure captures whatever variables the caller wants to react
    // to; we re-bind it via `deps` so we don't need it in our own dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, fallback, select, ...deps]);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run, setData };
}
