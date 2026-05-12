import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getNotifications, markAsRead, getUnreadCount, getInboxCounts } from '../services/notificationsApi';
import { useNotificationsStore } from '../../../store/notificationsStore';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import type { ReadNotificationsRequestDto } from '../types';

function toInt(v: number | string | undefined | null): number {
  if (v == null) return 0;
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  return Number.isFinite(n) ? Number(n) : 0;
}

interface ListArgs {
  page: number;
  pageSize?: number;
  templateIds?: string;
}

export function useNotificationsList({ page, pageSize = 30, templateIds }: ListArgs) {
  return useQuery({
    queryKey: ['notifications', 'list', page, pageSize, templateIds || 'all'],
    queryFn: () =>
      getNotifications({
        pn: page,
        ps: pageSize,
        pr: 10,
        t: templateIds,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useInboxCounts(enabled: boolean = true) {
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);
  const q = useQuery({
    queryKey: ['notifications', 'inbox-counts'],
    queryFn: async () => {
      const r = await getInboxCounts();
      const unreadNotifications = toInt(r.unreadNotifications);
      const unreadMessages = toInt(r.unreadMessages);
      setUnreadCount(unreadNotifications);
      // Mirror to iOS app badge so the home screen reflects server truth.
      if (Platform.OS === 'ios') {
        Notifications.setBadgeCountAsync(unreadNotifications).catch(() => {});
      }
      return { unreadNotifications, unreadMessages };
    },
    enabled,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // every 5 minutes while screen is mounted
    refetchOnWindowFocus: true,  // RN doesn't have a window, but RQ uses AppState behind the scenes when configured
  });

  // Also refetch when AppState flips to active (covers cases where focus events
  // don't fire — RN AppState is the canonical signal for "user is here now").
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        q.refetch();
      }
    });
    return () => sub.remove();
  }, [enabled, q]);

  return q;
}

export function useUnreadCount() {
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const r = await getUnreadCount();
      const n = typeof r.unreadCount === 'string' ? parseInt(r.unreadCount, 10) : r.unreadCount;
      const safe = Number.isFinite(n) ? Number(n) : 0;
      setUnreadCount(safe);
      return safe;
    },
    staleTime: 60_000,
  });
}

/**
 * Mark-as-read mutation. Syncs the global badge after success:
 *   - specific IDs: decrement by readCount
 *   - all (empty string): reset to 0
 */
export function useMarkAsRead() {
  const qc = useQueryClient();
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);
  return useMutation({
    mutationFn: (body: ReadNotificationsRequestDto) => markAsRead(body),
    onSuccess: (res) => {
      const remaining =
        typeof res.unreadCount === 'string' ? parseInt(res.unreadCount, 10) : res.unreadCount;
      if (Number.isFinite(remaining)) {
        const safe = Number(remaining);
        setUnreadCount(safe);
        if (Platform.OS === 'ios') {
          Notifications.setBadgeCountAsync(safe).catch(() => {});
        }
      }
      qc.invalidateQueries({ queryKey: ['notifications'] });
      // Also invalidate inbox-counts so the message badge stays accurate.
      qc.invalidateQueries({ queryKey: ['notifications', 'inbox-counts'] });
    },
  });
}
