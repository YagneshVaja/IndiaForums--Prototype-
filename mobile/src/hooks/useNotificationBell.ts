import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useInboxCounts } from '../features/notifications/hooks/useNotifications';

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
  const navigation = useNavigation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const inbox = useInboxCounts(isAuthenticated);

  const notifCount = inbox.data?.unreadNotifications ?? 0;

  const openNotifications = useCallback(() => {
    if (!isAuthenticated) {
      // Bell tap from a guest session — bounce to Auth flow.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigation.getParent()?.getParent() as any)?.navigate('Auth', {
        screen: 'Login',
      });
      return;
    }
    // Two-level parent because each tab is wrapped in its own native stack
    // navigator (e.g. HomeStack) inside the MainTabNavigator. Bubble out to
    // the tab navigator, switch to MySpace tab, then push Notifications onto
    // the MySpaceStack.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root = navigation.getParent()?.getParent() as any;
    if (root?.navigate) {
      root.navigate('Main', { screen: 'MySpace', params: { screen: 'Notifications' } });
      return;
    }
    // Fallback for when we're already inside the MySpace stack.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation as any).navigate?.('Notifications');
  }, [navigation, isAuthenticated]);

  return { notifCount, openNotifications };
}
