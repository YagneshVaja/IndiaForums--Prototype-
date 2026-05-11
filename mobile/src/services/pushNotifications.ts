// mobile/src/services/pushNotifications.ts
import { Platform, AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { QueryClient } from '@tanstack/react-query';

// Push APIs are unsupported in Expo Go on Android since SDK 53. Skip all
// notification side-effects there so the rest of the app can boot. Push works
// normally in dev builds and standalone builds.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

import { registerDevice } from '../features/profile/services/profileApi';
import { removeDevice } from '../features/profile/services/profileApi';
import { markAsRead } from '../features/notifications/services/notificationsApi';
import {
  getStoredDeviceTokenId,
  setStoredDeviceTokenId,
  clearStoredDeviceTokenId,
} from './pushStorage';
import { usePushStore, type PushPermissionStatus } from '../store/pushStore';
import { navigationRef } from '../navigation/navigationRef';
import { routeFromPayload, type NavTarget } from './notificationRouter';

// ── Foreground display behaviour ────────────────────────────────────────────
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

// ── Listener subscriptions held at module level ─────────────────────────────
let receivedSub: Notifications.EventSubscription | null = null;
let responseSub: Notifications.EventSubscription | null = null;
let appStateSub: NativeEventSubscription | null = null;
let coldStartHandled = false;

function getProjectId(): string | undefined {
  // Simplest cross-version read: expoConfig.extra.eas.projectId (EAS Build),
  // falling back to easConfig.projectId (older SDK shape).
  const fromExtra = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;
  if (fromExtra) return fromExtra;
  return (Constants.easConfig as { projectId?: string } | null)?.projectId;
}

export async function ensurePermission(): Promise<PushPermissionStatus> {
  const setPermission = usePushStore.getState().setPermission;

  if (!Device.isDevice) {
    setPermission('unavailable');
    return 'unavailable';
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    setPermission('granted');
    return 'granted';
  }
  if (current.status === 'denied' && !current.canAskAgain) {
    setPermission('denied');
    return 'denied';
  }

  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: false },
  });
  const status: PushPermissionStatus = req.granted ? 'granted' : 'denied';
  setPermission(status);
  return status;
}

async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function fetchExpoPushToken(): Promise<string | null> {
  const projectId = getProjectId();
  try {
    const r = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return r.data;
  } catch (err) {
    usePushStore.getState().setError(err instanceof Error ? err.message : 'token fetch failed');
    return null;
  }
}

export async function registerForPush(): Promise<void> {
  const store = usePushStore.getState();

  if (isExpoGo) {
    store.setPermission('unavailable');
    return;
  }

  await configureAndroidChannel();

  const status = await ensurePermission();
  if (status !== 'granted') return;

  const token = await fetchExpoPushToken();
  if (!token) return;

  // If we already have this exact token registered, skip the round-trip.
  if (store.expoPushToken === token && store.deviceTokenId) return;

  store.setToken(token);

  try {
    const res = await registerDevice({
      deviceToken: token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      deviceName: Device.deviceName ?? null,
      deviceModel: Device.modelName ?? null,
      osVersion: Device.osVersion ?? null,
      appVersion: Constants.expoConfig?.version ?? null,
    });
    if (res.success && res.deviceTokenId != null) {
      const id = String(res.deviceTokenId);
      store.setDeviceTokenId(id);
      await setStoredDeviceTokenId(id);
      store.setError(null);
    } else {
      store.setError(res.message || 'Backend rejected device registration');
    }
  } catch (err) {
    store.setError(err instanceof Error ? err.message : 'Network error during register');
  }
}

export async function deregisterFromPush(): Promise<void> {
  if (isExpoGo) {
    await clearStoredDeviceTokenId();
    usePushStore.getState().reset();
    return;
  }
  const id = usePushStore.getState().deviceTokenId ?? (await getStoredDeviceTokenId());
  if (id) {
    try {
      await removeDevice(id);
    } catch {
      // Logout shouldn't block on this. Server will eventually expire it.
    }
  }
  await clearStoredDeviceTokenId();
  usePushStore.getState().reset();
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    /* not supported on some platforms */
  }
}

// ── Listeners ───────────────────────────────────────────────────────────────

function navigateToTarget(target: NavTarget): void {
  if (!navigationRef.isReady()) return;
  // Navigation lib types here are loose; we trust the discriminated union.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any =
    target.screen === 'Notifications'
      ? undefined
      : { screen: target.screen, params: 'params' in target ? target.params : undefined };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigationRef.navigate as (...args: any[]) => void;
  if (target.stack === 'News') {
    nav('Main', {
      screen: 'News',
      params: { screen: target.screen, params: target.params },
    });
    return;
  }
  // All other NavTarget variants currently target MySpace; if a new stack is
  // added to NavTarget, add an explicit branch here so it isn't silently
  // routed to MySpace.
  // MySpace stack
  nav('Main', {
    screen: 'MySpace',
    params,
  });
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  isAuthenticated: () => boolean,
): void {
  const data = response.notification.request.content.data as Record<string, unknown> | null;

  // If logged out, swallow nav (don't push the user behind the auth wall).
  if (!isAuthenticated()) return;

  const target = routeFromPayload(data) ?? {
    stack: 'MySpace' as const,
    screen: 'Notifications' as const,
  };
  navigateToTarget(target);

  const notificationId =
    (data && (typeof data.notificationId === 'string' || typeof data.notificationId === 'number'))
      ? String(data.notificationId)
      : null;
  if (notificationId) {
    markAsRead({ ids: notificationId }).catch(() => {
      /* best-effort; the user already saw the notification */
    });
  }
}

interface InstallArgs {
  isAuthenticated: () => boolean;
  queryClient: QueryClient;
}

export function installPushListeners({ isAuthenticated, queryClient }: InstallArgs): void {
  if (isExpoGo) return;
  // Received in foreground → invalidate notification queries.
  receivedSub?.remove();
  receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    const data = notification.request.content.data as Record<string, unknown> | null;
    if (data && (data.threadId || data.messageId)) {
      queryClient.invalidateQueries({ queryKey: ['messages', 'overview'] });
    }
  });

  // Tap (foreground or background) → route.
  responseSub?.remove();
  responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationResponse(response, isAuthenticated);
  });

  // Re-check permission when the app returns to foreground (user may have
  // toggled it in OS settings while we were away).
  appStateSub?.remove();
  appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active' && isAuthenticated()) {
      void registerForPush();
    }
  });
}

export function teardownPushListeners(): void {
  receivedSub?.remove();
  receivedSub = null;
  responseSub?.remove();
  responseSub = null;
  appStateSub?.remove();
  appStateSub = null;
}

/**
 * Cold-start handler. Call once after the navigation container reports ready.
 * Re-running is a noop — we dedupe with `coldStartHandled`.
 */
export async function handleColdStartTap(isAuthenticated: () => boolean): Promise<void> {
  if (coldStartHandled) return;
  coldStartHandled = true;
  if (isExpoGo) return;
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) handleNotificationResponse(last, isAuthenticated);
  } catch {
    /* nothing to handle */
  }
}
