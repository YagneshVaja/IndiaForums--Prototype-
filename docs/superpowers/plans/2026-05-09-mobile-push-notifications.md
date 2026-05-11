# Mobile Push Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire end-to-end push notifications in the mobile app — permission, Expo push token registration with the backend, foreground/background/cold-start handling, deep-link routing on tap, and clean deregistration on logout.

**Architecture:** A `<PushBootstrap/>` effect component mounted in `App.tsx` owns lifecycle. A pure `notificationRouter` maps payloads to nav targets. A small dispatch screen hydrates id-only payloads (e.g., `topicId` → fetch topic → replace screen). The shared `navigationRef` lets non-React code navigate.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript, `expo-notifications`, `expo-device` (new), `expo-secure-store` (existing), Zustand, React Query, axios.

**Spec:** [docs/superpowers/specs/2026-05-09-mobile-push-notifications-design.md](../specs/2026-05-09-mobile-push-notifications-design.md)

---

## File Structure

### New
| Path | Responsibility |
|---|---|
| `mobile/src/services/notificationRouter.ts` | Pure `(payload) => NavTarget \| null`. No imports from `expo-notifications` or navigation. |
| `mobile/src/services/notificationRouter.test.ts` | Jest unit tests for the router. |
| `mobile/src/services/pushNotifications.ts` | Permission, Expo token, register/deregister, listener install/teardown. |
| `mobile/src/services/pushStorage.ts` | SecureStore wrapper for `deviceTokenId` (mirrors `authStorage.ts` pattern). |
| `mobile/src/store/pushStore.ts` | Zustand: `{ permissionStatus, expoPushToken, deviceTokenId, lastError }`. |
| `mobile/src/components/PushBootstrap.tsx` | Top-level effects, mounted in `App.tsx`. No UI. |
| `mobile/src/navigation/navigationRef.ts` | `createNavigationContainerRef<RootStackParamList>()` re-exported. |
| `mobile/src/features/notifications/screens/NotificationDispatchScreen.tsx` | Tiny shim screen that hydrates id-only payloads (fetches topic) and `replace`s itself. |

### Modified
| Path | Change |
|---|---|
| `mobile/src/features/profile/types.ts` | Add `RegisterDeviceRequestDto`, `RegisterDeviceResponseDto`. |
| `mobile/src/features/profile/services/profileApi.ts` | Add `registerDevice` function. |
| `mobile/src/navigation/types.ts` | Add `NotificationDispatch` to `MySpaceStackParamList`. |
| `mobile/src/navigation/MySpaceStack.tsx` | Register `NotificationDispatch` screen. |
| `mobile/App.tsx` | Pass `navigationRef` to `NavigationContainer`; mount `<PushBootstrap/>`. |
| `mobile/src/features/myspace/screens/MySpaceSettingsScreen.tsx` | Add "Push notifications" row. |
| `mobile/src/features/notifications/screens/NotificationsScreen.tsx` | Add a dismissible "permission denied" banner. |
| `mobile/package.json` | Add `expo-device`. |
| `mobile/app.json` | (No change expected — confirm `expo-notifications` plugin is sufficient.) |
| `mobile/CLAUDE.md` | Append a 3-line note pointing at `<PushBootstrap/>`. |

---

## Conventions and constraints

- **TypeScript strict** — every new file is fully typed; no `any`.
- **Run after each commit** (the user's repo has no CI yet — these are the gate):
  - `npm run tsc`  → must be clean
  - `npm run lint` → must be clean
- **Tests:** the router is the only unit-testable piece — test it in TDD style. Bootstrap and the push service are effect-heavy; rely on manual QA.
- **Commits:** small, frequent, scoped to a single task. Follow the existing commit style: `feat(mobile): …`, `fix(mobile): …`, `chore(mobile): …`.
- **Working directory** for all commands: `mobile/`.

---

## Task 1: Add navigationRef

**Why first:** the push tap handler runs outside React. It needs a way to navigate without a hook. Wiring this first lets us pass it to the bootstrap as soon as it mounts.

**Files:**
- Create: `mobile/src/navigation/navigationRef.ts`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Create `navigationRef.ts`**

```ts
// mobile/src/navigation/navigationRef.ts
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function isNavigationReady(): boolean {
  return navigationRef.isReady();
}
```

- [ ] **Step 2: Wire `navigationRef` into `App.tsx`**

In `mobile/App.tsx`, add the import and pass `ref` to `NavigationContainer`:

```tsx
// at top
import { navigationRef } from './src/navigation/navigationRef';
```

Change the `<NavigationContainer ...>` line in `ThemedNavigation` to:

```tsx
<NavigationContainer ref={navigationRef} theme={navTheme}>
  <RootNavigator />
</NavigationContainer>
```

- [ ] **Step 3: Type-check**

Run (in `mobile/`): `npm run tsc`
Expected: clean (no new errors).

- [ ] **Step 4: Commit**

```bash
git add mobile/src/navigation/navigationRef.ts mobile/App.tsx
git commit -m "feat(mobile): expose navigationRef for non-React navigation"
```

---

## Task 2: Add backend DTOs and `registerDevice` API

**Files:**
- Modify: `mobile/src/features/profile/types.ts`
- Modify: `mobile/src/features/profile/services/profileApi.ts`

- [ ] **Step 1: Add DTOs to `types.ts`**

Find the existing device-related DTOs (`UnregisterDeviceResponseDto`, `UpdateDevicePreferencesRequestDto`, etc.) and add directly below them:

```ts
// mobile/src/features/profile/types.ts (append in the device section)
export interface RegisterDeviceRequestDto {
  deviceToken: string;
  platform: 'ios' | 'android';
  deviceName?: string | null;
  deviceModel?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
}

export interface RegisterDeviceResponseDto {
  success: boolean;
  message: string;
  deviceTokenId: string | number | null;
  isNewDevice: boolean;
}
```

- [ ] **Step 2: Add the `registerDevice` API function**

In `mobile/src/features/profile/services/profileApi.ts`:

a. Extend the import block (top of file) to add the two new types:

```ts
import type {
  // ...existing imports...
  RegisterDeviceRequestDto,
  RegisterDeviceResponseDto,
} from '../types';
```

b. In the `// ── Devices ─` section (around line 366), add **after `getDevices`** and **before `removeDevice`**:

```ts
export function registerDevice(body: RegisterDeviceRequestDto) {
  return apiClient
    .post<RegisterDeviceResponseDto>('/devices/register', body)
    .then((r) => r.data);
}
```

- [ ] **Step 3: Type-check**

Run: `npm run tsc`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/profile/types.ts mobile/src/features/profile/services/profileApi.ts
git commit -m "feat(mobile): add registerDevice API + DTOs"
```

---

## Task 3: Install `expo-device`

`expo-device` exposes `deviceName`, `modelName`, `osVersion` — used to populate the optional fields on `RegisterDeviceRequestDto`.

**Files:**
- Modify: `mobile/package.json` and `mobile/package-lock.json` (via npm)

- [ ] **Step 1: Install**

```bash
cd mobile && npx expo install expo-device
```

`npx expo install` picks the version compatible with Expo 55. Expected: a single new dep added under `dependencies`.

- [ ] **Step 2: Verify import works**

Quickly type-check the import in a throwaway way:

```bash
node -e "console.log(require.resolve('expo-device'))"
```

Expected: prints a path (no error). If it errors, re-run install.

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore(mobile): add expo-device for device metadata"
```

---

## Task 4: Push storage (SecureStore wrapper)

Mirror the pattern in `authStorage.ts` — a small module that abstracts SecureStore with an in-memory fallback for web / Expo Go web. We only need to persist `deviceTokenId` (so we can DELETE on logout after a restart).

**Files:**
- Create: `mobile/src/services/pushStorage.ts`

- [ ] **Step 1: Create `pushStorage.ts`**

```ts
// mobile/src/services/pushStorage.ts
import { Platform } from 'react-native';

const KEY = 'if_push_device_token_id';

type SecureAdapter = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

const memStore: Record<string, string> = {};
const memSecure: SecureAdapter = {
  getItemAsync: async (k) => memStore[k] ?? null,
  setItemAsync: async (k, v) => { memStore[k] = v; },
  deleteItemAsync: async (k) => { delete memStore[k]; },
};

function createSecure(): SecureAdapter {
  if (Platform.OS === 'web') return memSecure;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-secure-store') as SecureAdapter;
  } catch {
    return memSecure;
  }
}

const secure = createSecure();

export async function getStoredDeviceTokenId(): Promise<string | null> {
  return secure.getItemAsync(KEY);
}

export async function setStoredDeviceTokenId(id: string): Promise<void> {
  await secure.setItemAsync(KEY, id);
}

export async function clearStoredDeviceTokenId(): Promise<void> {
  await secure.deleteItemAsync(KEY);
}
```

- [ ] **Step 2: Type-check**

Run: `npm run tsc`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/pushStorage.ts
git commit -m "feat(mobile): add pushStorage for deviceTokenId persistence"
```

---

## Task 5: Push store (Zustand)

Pure in-memory state describing the current push registration. No persistence here — `pushStorage.ts` handles the durable bit.

**Files:**
- Create: `mobile/src/store/pushStore.ts`

- [ ] **Step 1: Create `pushStore.ts`**

```ts
// mobile/src/store/pushStore.ts
import { create } from 'zustand';

export type PushPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unavailable';

type PushState = {
  permissionStatus: PushPermissionStatus;
  expoPushToken: string | null;
  deviceTokenId: string | null;
  lastError: string | null;
  bannerDismissed: boolean;

  setPermission: (s: PushPermissionStatus) => void;
  setToken: (token: string | null) => void;
  setDeviceTokenId: (id: string | null) => void;
  setError: (msg: string | null) => void;
  dismissBanner: () => void;
  reset: () => void;
};

const initial = {
  permissionStatus: 'undetermined' as PushPermissionStatus,
  expoPushToken: null,
  deviceTokenId: null,
  lastError: null,
  bannerDismissed: false,
};

export const usePushStore = create<PushState>((set) => ({
  ...initial,
  setPermission: (s) => set({ permissionStatus: s }),
  setToken: (t) => set({ expoPushToken: t }),
  setDeviceTokenId: (id) => set({ deviceTokenId: id }),
  setError: (msg) => set({ lastError: msg }),
  dismissBanner: () => set({ bannerDismissed: true }),
  reset: () => set({ ...initial }),
}));
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run tsc && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/store/pushStore.ts
git commit -m "feat(mobile): add pushStore for in-memory push state"
```

---

## Task 6: Notification router (TDD)

The router is pure. It takes `data: Record<string, unknown> | null | undefined` and returns a `NavTarget | null`. **Test-first.**

**Files:**
- Create: `mobile/src/services/notificationRouter.ts`
- Create: `mobile/src/services/notificationRouter.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `mobile/src/services/notificationRouter.test.ts` with the full test suite:

```ts
// mobile/src/services/notificationRouter.test.ts
import { routeFromPayload } from './notificationRouter';

describe('notificationRouter', () => {
  test('returns null for null/undefined/empty data', () => {
    expect(routeFromPayload(null)).toBeNull();
    expect(routeFromPayload(undefined)).toBeNull();
    expect(routeFromPayload({})).toBeNull();
  });

  test('articleId routes to ArticleDetail', () => {
    expect(routeFromPayload({ articleId: '42' })).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '42' },
    });
  });

  test('topicId (no postId) routes to NotificationDispatch', () => {
    expect(routeFromPayload({ topicId: '99' })).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '99' },
    });
  });

  test('topicId + postId routes to NotificationDispatch with focusPostId', () => {
    expect(routeFromPayload({ topicId: '99', postId: '12345' })).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '99', focusPostId: '12345' },
    });
  });

  test('threadId routes to MessageThread', () => {
    expect(routeFromPayload({ threadId: '7' })).toEqual({
      stack: 'MySpace',
      screen: 'MessageThread',
      params: { threadId: '7' },
    });
  });

  test('badgeId routes to BadgeDetail', () => {
    expect(routeFromPayload({ badgeId: '3' })).toEqual({
      stack: 'MySpace',
      screen: 'BadgeDetail',
      params: { badgeId: '3' },
    });
  });

  test('userId routes to Profile', () => {
    expect(routeFromPayload({ userId: '88' })).toEqual({
      stack: 'MySpace',
      screen: 'Profile',
      params: { userId: '88' },
    });
  });

  test('numeric IDs are coerced to strings', () => {
    expect(routeFromPayload({ articleId: 42 })).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '42' },
    });
  });

  test('deepLink (iforums://topic/99?postId=12) overrides ID keys', () => {
    expect(
      routeFromPayload({
        deepLink: 'iforums://topic/99?postId=12',
        articleId: '42', // ignored — deepLink wins
      }),
    ).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '99', focusPostId: '12' },
    });
  });

  test('deepLink iforums://message/55 routes to MessageThread', () => {
    expect(routeFromPayload({ deepLink: 'iforums://message/55' })).toEqual({
      stack: 'MySpace',
      screen: 'MessageThread',
      params: { threadId: '55' },
    });
  });

  test('deepLink iforums://article/77 routes to ArticleDetail', () => {
    expect(routeFromPayload({ deepLink: 'iforums://article/77' })).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '77' },
    });
  });

  test('deepLink iforums://badge/9 routes to BadgeDetail', () => {
    expect(routeFromPayload({ deepLink: 'iforums://badge/9' })).toEqual({
      stack: 'MySpace',
      screen: 'BadgeDetail',
      params: { badgeId: '9' },
    });
  });

  test('deepLink iforums://user/123 routes to Profile', () => {
    expect(routeFromPayload({ deepLink: 'iforums://user/123' })).toEqual({
      stack: 'MySpace',
      screen: 'Profile',
      params: { userId: '123' },
    });
  });

  test('malformed deepLink falls back to ID keys', () => {
    expect(routeFromPayload({ deepLink: 'not a url', articleId: '42' })).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '42' },
    });
  });

  test('malformed deepLink with no ID keys returns null', () => {
    expect(routeFromPayload({ deepLink: 'not a url' })).toBeNull();
  });

  test('unknown keys only returns null', () => {
    expect(routeFromPayload({ randomKey: 'value' })).toBeNull();
  });

  test('priority: articleId beats topicId beats threadId beats badgeId beats userId', () => {
    expect(
      routeFromPayload({
        articleId: '1',
        topicId: '2',
        threadId: '3',
        badgeId: '4',
        userId: '5',
      }),
    ).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '1' },
    });
  });
});
```

- [ ] **Step 2: Run tests — they should fail (no router yet)**

Run: `npm run test -- notificationRouter`
Expected: tests fail with "Cannot find module './notificationRouter'".

- [ ] **Step 3: Create the router implementation**

```ts
// mobile/src/services/notificationRouter.ts

export type NavTarget =
  | { stack: 'MySpace'; screen: 'Notifications' }
  | { stack: 'MySpace'; screen: 'MessageThread'; params: { threadId: string } }
  | { stack: 'MySpace'; screen: 'BadgeDetail'; params: { badgeId: string } }
  | { stack: 'MySpace'; screen: 'Profile'; params: { userId: string } }
  | {
      stack: 'MySpace';
      screen: 'NotificationDispatch';
      params: { topicId: string; focusPostId?: string };
    }
  | {
      stack: 'News';
      screen: 'ArticleDetail';
      params: { id: string };
    };

type AnyData = Record<string, unknown> | null | undefined;

function asString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v.length > 0 ? v : null;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

/**
 * Parse iforums:// deep link → NavTarget.
 * Recognised forms:
 *   iforums://topic/<id>[?postId=<id>]
 *   iforums://message/<id>
 *   iforums://article/<id>
 *   iforums://badge/<id>
 *   iforums://user/<id>
 */
function parseDeepLink(raw: string): NavTarget | null {
  const m = raw.match(/^iforums:\/\/([a-z]+)\/([^?#]+)(?:\?(.+))?$/i);
  if (!m) return null;
  const [, kind, id, query] = m;
  const params = new URLSearchParams(query ?? '');
  switch (kind.toLowerCase()) {
    case 'topic': {
      const postId = params.get('postId') ?? params.get('focusPostId');
      return {
        stack: 'MySpace',
        screen: 'NotificationDispatch',
        params: postId ? { topicId: id, focusPostId: postId } : { topicId: id },
      };
    }
    case 'message':
      return { stack: 'MySpace', screen: 'MessageThread', params: { threadId: id } };
    case 'article':
      return { stack: 'News', screen: 'ArticleDetail', params: { id } };
    case 'badge':
      return { stack: 'MySpace', screen: 'BadgeDetail', params: { badgeId: id } };
    case 'user':
      return { stack: 'MySpace', screen: 'Profile', params: { userId: id } };
    default:
      return null;
  }
}

export function routeFromPayload(data: AnyData): NavTarget | null {
  if (!data || typeof data !== 'object') return null;

  // 1. deepLink wins if it parses
  const deepLinkStr = asString(data.deepLink);
  if (deepLinkStr) {
    const parsed = parseDeepLink(deepLinkStr);
    if (parsed) return parsed;
    // fall through: malformed deepLink — try ID keys
  }

  // 2. ID keys — first match wins, in priority order
  const articleId = asString(data.articleId);
  if (articleId) {
    return { stack: 'News', screen: 'ArticleDetail', params: { id: articleId } };
  }

  const topicId = asString(data.topicId);
  if (topicId) {
    const focusPostId = asString(data.postId) ?? asString(data.focusPostId);
    return {
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: focusPostId ? { topicId, focusPostId } : { topicId },
    };
  }

  const threadId = asString(data.threadId);
  if (threadId) {
    return { stack: 'MySpace', screen: 'MessageThread', params: { threadId } };
  }

  const badgeId = asString(data.badgeId);
  if (badgeId) {
    return { stack: 'MySpace', screen: 'BadgeDetail', params: { badgeId } };
  }

  const userId = asString(data.userId);
  if (userId) {
    return { stack: 'MySpace', screen: 'Profile', params: { userId } };
  }

  return null;
}
```

- [ ] **Step 4: Run tests — they should pass**

Run: `npm run test -- notificationRouter`
Expected: all tests pass.

- [ ] **Step 5: Type-check + lint**

Run: `npm run tsc && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/services/notificationRouter.ts mobile/src/services/notificationRouter.test.ts
git commit -m "feat(mobile): add notificationRouter with payload→nav mapping"
```

---

## Task 7: Push notifications service

Side-effectful module that owns permission, token, register/deregister, listener install/teardown. The bootstrap component consumes its functions; the router stays pure.

**Files:**
- Create: `mobile/src/services/pushNotifications.ts`

- [ ] **Step 1: Create `pushNotifications.ts`**

```ts
// mobile/src/services/pushNotifications.ts
import { Platform, AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import type { QueryClient } from '@tanstack/react-query';

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
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// ── Listener subscriptions held at module level ─────────────────────────────
let receivedSub: Notifications.EventSubscription | null = null;
let responseSub: Notifications.EventSubscription | null = null;
let appStateSub: NativeEventSubscription | null = null;
let coldStartHandled = false;

function getProjectId(): string | undefined {
  const extra =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined) ??
    (Constants.easConfig as { projectId?: string } | undefined);
  return extra && 'eas' in extra ? extra.eas?.projectId : extra?.projectId;
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

  if (target.stack === 'News') {
    navigationRef.navigate('Main' as never, {
      screen: 'News',
      params: { screen: target.screen, params: target.params },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    return;
  }
  // MySpace stack
  navigationRef.navigate('Main' as never, {
    screen: 'MySpace',
    params,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
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
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) handleNotificationResponse(last, isAuthenticated);
  } catch {
    /* nothing to handle */
  }
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run tsc && npm run lint`
Expected: clean. If `npm run lint` complains about the loose `any` casts on `navigation.navigate`, that's why they have inline `eslint-disable-next-line` comments — leave them.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/pushNotifications.ts
git commit -m "feat(mobile): add pushNotifications service (register, listeners, cold-start)"
```

---

## Task 8: PushBootstrap component

The React glue. Subscribes to `authStore.isAuthenticated` and the `QueryClient`, calls into `pushNotifications`. No UI.

**Files:**
- Create: `mobile/src/components/PushBootstrap.tsx`

- [ ] **Step 1: Create `PushBootstrap.tsx`**

```tsx
// mobile/src/components/PushBootstrap.tsx
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../store/authStore';
import {
  registerForPush,
  deregisterFromPush,
  installPushListeners,
  teardownPushListeners,
  handleColdStartTap,
} from '../services/pushNotifications';

export default function PushBootstrap(): null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const lastAuthRef = useRef<boolean | null>(null);
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  // Install listeners once on mount.
  useEffect(() => {
    installPushListeners({
      isAuthenticated: () => authRef.current,
      queryClient,
    });
    void handleColdStartTap(() => authRef.current);
    return () => {
      teardownPushListeners();
    };
    // queryClient is stable across the app; effect runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to auth changes: register on login, deregister on logout.
  useEffect(() => {
    const prev = lastAuthRef.current;
    lastAuthRef.current = isAuthenticated;
    if (prev === isAuthenticated) return;

    if (isAuthenticated) {
      void registerForPush();
    } else if (prev === true) {
      // Only deregister on actual transitions (true → false), not initial mount.
      void deregisterFromPush();
    }
  }, [isAuthenticated]);

  return null;
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run tsc && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/PushBootstrap.tsx
git commit -m "feat(mobile): add PushBootstrap effect component"
```

---

## Task 9: Mount `<PushBootstrap/>` in `App.tsx`

**Files:**
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Update `App.tsx`**

Add the import near the top of `mobile/App.tsx`:

```tsx
import PushBootstrap from './src/components/PushBootstrap';
```

Then change the `App` return value so `<PushBootstrap/>` lives **inside** the `QueryClientProvider` (it uses `useQueryClient`):

```tsx
return (
  <GestureHandlerRootView style={styles.root} onLayout={onLayoutReady}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PushBootstrap />
        <ThemedNavigation />
      </QueryClientProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
```

- [ ] **Step 2: Type-check**

Run: `npm run tsc`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add mobile/App.tsx
git commit -m "feat(mobile): mount PushBootstrap in App"
```

---

## Task 10: NotificationDispatch shim screen

When the payload only has `topicId`, we need to fetch the topic before navigating to `TopicDetail` (which requires a full `ForumTopic` object). This screen does that hydration and then `replace`s itself.

**Files:**
- Create: `mobile/src/features/notifications/screens/NotificationDispatchScreen.tsx`
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/MySpaceStack.tsx`

- [ ] **Step 1: Add the param shape to `MySpaceStackParamList`**

In `mobile/src/navigation/types.ts`, add inside `MySpaceStackParamList` (anywhere is fine, but place it near `Notifications`):

```ts
export type MySpaceStackParamList = {
  // ...existing entries...
  NotificationDispatch: { topicId: string; focusPostId?: string };
};
```

**Topic hydration uses the existing helper.** The OpenAPI spec has no GET `/forums/topics/{id}` that returns a single topic. Instead, the existing `fetchTopicPosts(topicId, pageNumber, pageSize)` in `mobile/src/services/api.ts` (around line 3158) returns `{ posts, topicDetail: ForumTopic | null, ... }`. We call it with `pageSize=1` (cheapest possible page) and use the `topicDetail` to populate `TopicDetail`'s nav params.

- [ ] **Step 2: Create the dispatch screen**

```tsx
// mobile/src/features/notifications/screens/NotificationDispatchScreen.tsx
import React, { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { extractApiError, fetchTopicPosts } from '../../../services/api';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'NotificationDispatch'>;

export default function NotificationDispatchScreen({ navigation, route }: Props) {
  const { topicId, focusPostId } = route.params;
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const numericTopicId = Number(topicId);

  const q = useQuery({
    queryKey: ['notification-dispatch', 'topic', topicId],
    queryFn: () => fetchTopicPosts(numericTopicId, 1, 1),
    enabled: Number.isFinite(numericTopicId) && numericTopicId > 0,
    staleTime: 0,
  });

  useEffect(() => {
    const topic = q.data?.topicDetail;
    if (topic) {
      navigation.replace('TopicDetail', {
        topic,
        // jumpToLast surfaces the latest reply when no specific post is targeted.
        // Pass focusPostId via topic.focusPostId at the TopicDetail layer if/when
        // that screen learns to scroll to it (out of scope for this plan).
        jumpToLast: !focusPostId,
      });
    }
  }, [q.data?.topicDetail, focusPostId, navigation]);

  // If the topicId was malformed, fail straight to the Notifications list.
  useEffect(() => {
    if (!Number.isFinite(numericTopicId) || numericTopicId <= 0) {
      navigation.replace('Notifications');
    }
  }, [numericTopicId, navigation]);

  return (
    <View style={styles.screen}>
      <TopNavBack title="Opening…" onBack={() => navigation.goBack()} />
      <View style={styles.center}>
        {q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.hint}>Loading the discussion…</Text>
            <Pressable
              onPress={() => navigation.replace('Notifications')}
              hitSlop={8}
              style={styles.skip}
            >
              <Text style={styles.skipText}>Open notifications instead</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
    hint: { fontSize: 13, color: c.textSecondary },
    skip: { paddingTop: 12 },
    skipText: { fontSize: 13, color: c.primary, fontWeight: '700' },
  });
}
```

- [ ] **Step 3: Register the screen in `MySpaceStack.tsx`**

In `mobile/src/navigation/MySpaceStack.tsx`:

a. Add the import alongside the others:

```tsx
import NotificationDispatchScreen from '../features/notifications/screens/NotificationDispatchScreen';
```

b. Add the screen entry in the `Stack.Navigator` (anywhere; place it next to `Notifications` for readability):

```tsx
<Stack.Screen name="NotificationDispatch" component={NotificationDispatchScreen} />
```

- [ ] **Step 4: Type-check + lint**

Run: `npm run tsc && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add \
  mobile/src/features/notifications/screens/NotificationDispatchScreen.tsx \
  mobile/src/navigation/MySpaceStack.tsx \
  mobile/src/navigation/types.ts
git commit -m "feat(mobile): add NotificationDispatch screen for id-only deep links"
```

---

## Task 11: Push notifications row in `MySpaceSettingsScreen`

Surface the permission state so a user who denied can re-enable from in-app. The file uses a locally-defined `<Row .../>` component (see lines 48–83 of the file). The "Devices" row currently has `last` — we'll move that flag onto the new row, which becomes the new last row in the Account card.

**Files:**
- Modify: `mobile/src/features/myspace/screens/MySpaceSettingsScreen.tsx`

- [ ] **Step 1: Add imports at the top of the file**

Add to the existing `from 'react-native'` import:

```tsx
import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar, Linking } from 'react-native';
```

(Just add `Linking` to the existing list.)

Add two new imports below the existing imports:

```tsx
import { usePushStore } from '../../../store/pushStore';
import { registerForPush } from '../../../services/pushNotifications';
```

- [ ] **Step 2: Read the push permission status inside the component**

Inside `MySpaceSettingsScreen`, near the other Zustand selectors (`user`, `isModerator`, `logout`):

```tsx
const pushStatus = usePushStore((s) => s.permissionStatus);
```

- [ ] **Step 3: Remove `last` from the Devices row**

Find the `<Row ... label="Devices" .../>` block (around lines 151–162). Delete the `last` prop:

Before:
```tsx
<Row
  icon="phone-portrait-outline"
  tint="green"
  label="Devices"
  subtitle="Manage connected devices"
  onPress={() => navigation.navigate('Devices')}
  last
  styles={styles}
  chevronColor={colors.textTertiary}
  rippleColor={colors.surface}
  tints={tints}
/>
```

After:
```tsx
<Row
  icon="phone-portrait-outline"
  tint="green"
  label="Devices"
  subtitle="Manage connected devices"
  onPress={() => navigation.navigate('Devices')}
  styles={styles}
  chevronColor={colors.textTertiary}
  rippleColor={colors.surface}
  tints={tints}
/>
```

- [ ] **Step 4: Add the Push notifications row immediately after the Devices row**

Insert this `<Row/>` directly after the Devices row, still inside the same `<View style={styles.card}>` block:

```tsx
<Row
  icon="notifications-outline"
  tint="green"
  label="Push notifications"
  subtitle={
    pushStatus === 'granted'
      ? 'On'
      : pushStatus === 'denied'
        ? 'System permission denied — tap to open settings'
        : pushStatus === 'unavailable'
          ? 'Not supported on this device'
          : 'Off — tap to enable'
  }
  onPress={() => {
    if (pushStatus === 'denied') {
      void Linking.openSettings();
    } else if (pushStatus !== 'unavailable') {
      void registerForPush();
    }
  }}
  last
  styles={styles}
  chevronColor={colors.textTertiary}
  rippleColor={colors.surface}
  tints={tints}
/>
```

- [ ] **Step 5: Type-check + lint**

Run: `npm run tsc && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/features/myspace/screens/MySpaceSettingsScreen.tsx
git commit -m "feat(mobile): add Push Notifications row in MySpace settings"
```

---

## Task 12: Permission-denied banner in `NotificationsScreen`

A small dismissible banner above the filter bar when permission is `denied`. Doesn't block existing UI.

**Files:**
- Modify: `mobile/src/features/notifications/screens/NotificationsScreen.tsx`

- [ ] **Step 1: Add imports**

At the top of `NotificationsScreen.tsx`:

```tsx
import { Linking } from 'react-native';
import { usePushStore } from '../../../store/pushStore';
```

- [ ] **Step 2: Insert the banner above the filter bar**

Inside the component, just before the existing `{/* Filter bar */}` block:

```tsx
{(() => {
  const status = usePushStore((s) => s.permissionStatus);
  const dismissed = usePushStore((s) => s.bannerDismissed);
  const dismissBanner = usePushStore((s) => s.dismissBanner);
  if (status !== 'denied' || dismissed) return null;
  return (
    <Pressable
      onPress={() => Linking.openSettings()}
      style={styles.permBanner}
    >
      <Ionicons name="notifications-off-outline" size={16} color={colors.warning} />
      <Text style={styles.permBannerText} numberOfLines={2}>
        Turn on push notifications to get replies and mentions in real time.
      </Text>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          dismissBanner();
        }}
        hitSlop={10}
      >
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
})()}
```

- [ ] **Step 3: Add the styles**

In `makeStyles(c: ThemeColors)`, add:

```ts
permBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginHorizontal: 14,
  marginTop: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
  backgroundColor: c.warningSoft,
  borderWidth: 1,
  borderColor: c.warningSoftBorder,
},
permBannerText: {
  flex: 1,
  fontSize: 12,
  color: c.warning,
  fontWeight: '600',
  lineHeight: 16,
},
```

- [ ] **Step 4: Type-check + lint**

Run: `npm run tsc && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/features/notifications/screens/NotificationsScreen.tsx
git commit -m "feat(mobile): permission-denied banner in NotificationsScreen"
```

---

## Task 13: Documentation note in `mobile/CLAUDE.md`

Three lines so the next session knows where push lives.

**Files:**
- Modify: `mobile/CLAUDE.md`

- [ ] **Step 1: Append to the "Gotchas" section**

```md
- **Push notifications** — registration runs from `<PushBootstrap/>` mounted in `App.tsx`. Token is acquired via `services/pushNotifications.ts` (Expo push tokens). Tap routing is a pure mapping in `services/notificationRouter.ts`. Logout calls `DELETE /devices/{id}`.
```

- [ ] **Step 2: Commit**

```bash
git add mobile/CLAUDE.md
git commit -m "docs(mobile): note push-notifications wiring in CLAUDE.md"
```

---

## Task 14: Whole-app type-check, lint, and tests

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole `mobile/`**

```bash
cd mobile && npm run tsc
```

Expected: clean.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: clean (or only pre-existing warnings).

- [ ] **Step 3: Run the test suite**

```bash
npm run test
```

Expected: all tests pass — at minimum the `notificationRouter` suite. (No other tests in the repo today; that's fine.)

- [ ] **Step 4: If anything fails, fix in place. Do not skip and continue.**

---

## Task 15: Manual QA checklist (on a real device)

iOS simulator does **not** deliver push notifications. You need a physical iOS device or an Android device/emulator with Google Play Services. A development build (`eas build --profile development`) is recommended; Expo Go also works for the receive/tap flow but has limitations on icons.

**Files:** none (manual verification)

- [ ] **Step 1: Boot the dev client**

```bash
cd mobile && npm run start
```

Open on a physical device. Sign in.

- [ ] **Step 2: Capture the Expo push token**

In a debug console (e.g., add a temporary `console.log` in `PushBootstrap` or read `usePushStore.getState().expoPushToken` from the React DevTools), grab the token (`ExponentPushToken[…]`).

- [ ] **Step 3: Send a test push for each template**

Use https://expo.dev/notifications. Send the following payloads (one at a time):

| Payload `data` | Expected result |
|---|---|
| `{ "deepLink": "iforums://message/<a-real-thread-id>" }` | Tap → `MessageThread` opens with that thread. |
| `{ "deepLink": "iforums://topic/<a-real-topic-id>?postId=<a-real-post-id>" }` | Tap → loading spinner → `TopicDetail` opens for that topic. |
| `{ "deepLink": "iforums://badge/<a-real-badge-id>" }` | Tap → `BadgeDetail`. |
| `{ "deepLink": "iforums://user/<a-real-user-id>" }` | Tap → `Profile`. |
| `{ "deepLink": "iforums://article/<a-real-article-id>" }` | Tap → `ArticleDetail` in the News tab. |
| `{ "articleId": "<id>" }` (no deepLink) | Tap → `ArticleDetail`. |
| `{}` (empty data) | Tap → `Notifications` list. |

- [ ] **Step 4: Verify foreground / background / cold start**

For at least one of the deep links above:
1. **Foreground**: app open on Home → push arrives → in-app banner shown → tap → routes correctly.
2. **Background**: app backgrounded → push arrives → tap from notification tray → app resumes and routes.
3. **Cold start**: force-quit the app → send push → tap from tray → app launches and routes.

- [ ] **Step 5: Verify permission-denied flow**

1. Turn off notifications for the app in OS settings.
2. Reopen the app → expect the dismissible banner in `NotificationsScreen`.
3. Open `MySpace → Settings → Push notifications` → "System permission denied" → tap opens iOS/Android settings.
4. Re-enable in OS settings → return to app → token is fetched and registered automatically (verify via the Devices screen).

- [ ] **Step 6: Verify logout deregisters**

1. Sign out.
2. Sign in on a different account on the same device.
3. Check the Devices screen for the new account: the device should appear (re-registered).
4. (Optional) Have the backend confirm the previous user's `deviceTokenId` is gone.

- [ ] **Step 7: If something fails, fix it before claiming the work done.** Do not mark Task 15 complete on partial results.

---

## Self-review against the spec

| Spec section | Covered by |
|---|---|
| Architecture diagram | Tasks 7, 8, 9, 1 |
| `services/pushNotifications.ts` | Task 7 |
| `services/notificationRouter.ts` | Task 6 |
| `components/PushBootstrap.tsx` | Tasks 8, 9 |
| `store/pushStore.ts` | Task 5 |
| `pushStorage.ts` | Task 4 |
| `navigationRef.ts` | Task 1 |
| `NotificationDispatch` screen | Task 10 |
| `RegisterDeviceRequestDto` / Response + API | Task 2 |
| `expo-device` dependency | Task 3 |
| `MySpaceSettings` row | Task 11 |
| `NotificationsScreen` banner | Task 12 |
| Lifecycle: login → register | Tasks 7, 8 |
| Lifecycle: foreground / received | Task 7 (`installPushListeners`) |
| Lifecycle: tap | Task 7 (`addNotificationResponseReceivedListener`) |
| Lifecycle: cold start | Task 7 (`handleColdStartTap`) |
| Lifecycle: logout | Tasks 7 (`deregisterFromPush`), 8 (PushBootstrap effect) |
| Lifecycle: AppState foreground re-check | Task 7 (`AppState.addEventListener`) |
| Edge case: simulator | Task 7 (`Device.isDevice` guard → 'unavailable') |
| Edge case: token rotation | Task 7 (compare token in `registerForPush` + AppState re-check) |
| Edge case: 401 on register | Existing axios refresh path (no extra work) |
| Edge case: payload missing keys | Task 6 router test "unknown keys only" + Task 7 fallback to Notifications |
| Edge case: malformed deepLink | Task 6 router tests + impl |
| Edge case: tap while logged out | Task 7 (`handleNotificationResponse` guard) |
| Manual QA checklist | Task 15 |
| `npm run tsc` / `lint` / `test` gate | Task 14 |
| Doc note in `CLAUDE.md` | Task 13 |

No gaps identified. No `TBD`/`TODO` placeholders. Type names are consistent across tasks (`NavTarget`, `PushPermissionStatus`, `RegisterDeviceRequestDto`, `MySpaceStackParamList['NotificationDispatch']`).

---

## Open questions (carried over from spec — non-blocking)

1. Backend: confirm `deviceToken` is forwarded to **Expo Push Service** (not raw FCM/APNs).
2. Backend: confirm payload `data` keys per template — the router has documented fallbacks, but explicit conventions let us tighten the type later.
3. Backend: provide a `templateId → category` map so we can drop the regex icon picker in `NotificationsScreen` (out of scope for this plan).
