import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useInboxCounts } from '../features/notifications/hooks/useNotifications';
import { navigationRef } from '../navigation/navigationRef';

/**
 * Shared header-bell logic. Returns:
 *   - notifCount: unread notification count (live from /inbox-counts)
 *   - openNotifications: navigates to MySpace > Notifications regardless of
 *     which tab the caller is mounted in
 *
 * Use from any screen that wants a "tap the bell, go to Notifications" header
 * icon (Home / News / Forums / Search).
 */
export function useNotificationBell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const inbox = useInboxCounts(isAuthenticated);
  const notifCount = inbox.data?.unreadNotifications ?? 0;

  const openNotifications = useCallback(() => {
    if (!navigationRef.isReady()) return;
    if (!isAuthenticated) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigationRef as any).navigate('Auth', { screen: 'Login' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigationRef as any).navigate('Main', {
      screen: 'MySpace',
      params: { screen: 'Notifications' },
    });
  }, [isAuthenticated]);

  return { notifCount, openNotifications };
}
