import { useState, useEffect, useCallback } from 'react';
import { getVerificationLogs } from '../services/emailVerificationApi';
import { extractApiError } from '../services/api';

export default function useEmailVerificationLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVerificationLogs();
      setLogs(res.data?.logs || res.data || []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load verification logs'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { logs, loading, error, refetch: fetch };
}
