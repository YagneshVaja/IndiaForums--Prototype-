import { useState, useEffect, useCallback } from 'react';
import * as notificationsApi from '../services/notificationsApi';
import * as messagesApi from '../services/messagesApi';

export function useUnreadCount(pollInterval = null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      const c = res.data?.unreadCount ?? res.data?.count ?? res.data ?? 0;
      setCount(typeof c === 'number' ? c : 0);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollInterval) {
      const id = setInterval(refresh, pollInterval);
      return () => clearInterval(id);
    }
  }, [refresh, pollInterval]);

  return { count, loading, refresh };
}

/**
 * Unread private-message count for the MySpace badge.
 *
 * The backend has no dedicated counter endpoint, so we ask `/messages` with
 * `mode=Unread, ps=1` and read `totalCount` from the response envelope. This
 * is cheap (1 row) and doesn't burn pages.
 */
export function useUnreadMessageCount(pollInterval = null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await messagesApi.getMessages({ mode: messagesApi.MESSAGE_MODES.UNREAD, ps: 1 });
      const d = res.data || {};
      const c = d.totalCount ?? d.unreadCount ?? d.totalItems ?? (Array.isArray(d.messages) ? d.messages.length : 0);
      setCount(typeof c === 'number' ? c : 0);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollInterval) {
      const id = setInterval(refresh, pollInterval);
      return () => clearInterval(id);
    }
  }, [refresh, pollInterval]);

  return { count, loading, refresh };
}
