import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getNotifications, markAsRead, getUnreadCount } from '../services/notificationsApi';
import { useNotificationsStore } from '../../../store/notificationsStore';
import type { ReadNotificationsRequestDto } from '../types';

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
      if (Number.isFinite(remaining)) setUnreadCount(Number(remaining));
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
