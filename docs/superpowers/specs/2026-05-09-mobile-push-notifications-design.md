# Mobile Push Notifications — End-to-End Design

**Date:** 2026-05-09
**Branch:** `feat/celebrity-profile-tier1` (will branch off for implementation)
**Scope:** Wire actual push delivery + tap-to-deep-link into the IndiaForums mobile app.

---

## Why

`expo-notifications` is installed, the plugin is configured (icon + color), and the EAS `projectId` is set in `app.json`. The backend exposes `/devices/register`, `/devices/{id}`, and `/devices/{id}/preferences`, and the existing `DevicesScreen` already lists/removes devices and toggles per-device preferences. **What is missing is the actual registration flow:** the app never asks for permission, never fetches an Expo push token, never tells the backend who to send to, and has no listeners for received/tapped notifications. So push doesn't deliver, and even if it did, taps would do nothing.

This spec adds:
1. Permission + token acquisition on login.
2. Backend registration via `POST /devices/register`.
3. Foreground/background/cold-start listeners.
4. A pure router that turns notification payloads into navigation targets.
5. Logout deregistration via `DELETE /devices/{id}`.
6. A user-visible "push notifications" row in `MySpaceSettings` to recover from a denied permission state.

Out of scope (deferred to follow-ups):
- Per-template preferences UI (requires its own `/me/preferences` design — backend doesn't expose template-level toggles on the device endpoints).
- Rich notifications (images, action buttons).
- Android notification channels beyond a single default channel.
- Web push (`platform: "web"` route).
- iOS notification grouping by thread identifier.

---

## Decisions (locked in)

| Decision | Choice | Rationale |
|---|---|---|
| Token format | Expo push tokens (`ExponentPushToken[…]`) | Managed Expo workflow, single API for iOS+Android, works with dev builds, EAS `projectId` already set. |
| Tap behavior | Deep-link to relevant content | Better UX than always opening the list; payload contract documented below. |
| Lifecycle owner | A `PushBootstrap` effect component mounted in `App.tsx` | Keeps `App.tsx` lean; effects are colocated; bootstrap can subscribe to `authStore` directly. |
| Router shape | Pure function `(payload) => NavTarget` | Unit-testable without nav mocks; easy to evolve as backend payload conventions change. |

---

## Architecture

```
App.tsx
 ├── QueryClientProvider
 ├── NavigationContainer (now uses navigationRef)
 │    └── RootNavigator
 └── <PushBootstrap/>   ← effects only, no UI
       │
       ├── permissionFlow      uses Notifications.getPermissionsAsync / requestPermissionsAsync
       ├── tokenFlow           Notifications.getExpoPushTokenAsync({ projectId }) → POST /devices/register
       ├── foregroundHandler   Notifications.setNotificationHandler (banner + badge, no sound)
       ├── receivedListener    addNotificationReceivedListener → invalidate notifications queries
       ├── tapListener         addNotificationResponseReceivedListener → router → navigationRef.navigate
       └── coldStartHandler    Notifications.getLastNotificationResponseAsync (one-shot at mount)
```

**Module boundaries:**

- `services/pushNotifications.ts` — side-effectful: permission, token, register, deregister, listener install/teardown. Imports the API and the router.
- `services/notificationRouter.ts` — pure: `(payload) => NavTarget | null`. No imports from `expo-notifications` or navigation. Easy to unit-test.
- `components/PushBootstrap.tsx` — React glue. Subscribes to `authStore.isAuthenticated`, calls into `services/pushNotifications`. No business logic.
- `store/pushStore.ts` — Zustand. Persists permission status, the current Expo token, the backend-issued `deviceTokenId`, and last error. The `deviceTokenId` is also mirrored to `expo-secure-store` so we can DELETE it on logout even after an app restart (Zustand state itself is not persisted in this codebase by default).

---

## Files

### New

| Path | Purpose |
|---|---|
| `mobile/src/services/pushNotifications.ts` | Registration, deregistration, listener install/teardown. |
| `mobile/src/services/notificationRouter.ts` | Pure `(payload) => NavTarget` mapping. |
| `mobile/src/components/PushBootstrap.tsx` | Top-level effects, mounted in `App.tsx`. |
| `mobile/src/store/pushStore.ts` | `{ permissionStatus, expoPushToken, deviceTokenId, lastError }`. |
| `mobile/src/services/__tests__/notificationRouter.test.ts` | Unit tests for the router (per-template payloads + edge cases). |

### Modified

| Path | Change |
|---|---|
| `mobile/src/features/profile/services/profileApi.ts` | Add `registerDevice(body)` calling `POST /devices/register`. |
| `mobile/src/features/profile/types.ts` | Add `RegisterDeviceRequestDto`, `RegisterDeviceResponseDto`. |
| `mobile/App.tsx` | Mount `<PushBootstrap/>` inside the providers; pass `navigationRef` to `NavigationContainer`. |
| `mobile/src/navigation/RootNavigator.tsx` (or new `navigationRef.ts`) | Export `navigationRef = createNavigationContainerRef<RootStackParamList>()` so non-React code can navigate. |
| `mobile/src/features/myspace/screens/MySpaceSettingsScreen.tsx` | Add a "Push notifications" row that reflects permission status and re-runs registration / opens system settings. |
| `mobile/app.json` | Confirm iOS `infoPlist.UIBackgroundModes` includes `remote-notification`. Add `expo-device` plugin if needed. |
| `mobile/CLAUDE.md` | One-line note that push registration runs from `<PushBootstrap/>`. |

### Dependencies to add

- `expo-device` — `Device.deviceName`, `Device.modelName`, `Device.osVersion`. Used to populate optional fields on `RegisterDeviceRequestDto` so the Devices screen renders meaningful labels.

---

## Backend contract

### `POST /api/v1/devices/register`
```json
// Request — RegisterDeviceRequestDto
{
  "deviceToken":  "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform":     "ios" | "android",
  "deviceName":   "Yagnesh's iPhone",   // optional
  "deviceModel":  "iPhone15,2",          // optional
  "osVersion":    "17.5.1",              // optional
  "appVersion":   "1.0.0"                // optional
}

// Response — RegisterDeviceResponseDto
{
  "success":         true,
  "message":         "Device registered.",
  "deviceTokenId":   "12345",
  "isNewDevice":     true
}
```

### `DELETE /api/v1/devices/{deviceId}`
Called on logout with the `deviceTokenId` from the register response.

### `PUT /api/v1/devices/{deviceId}/preferences`
Already wired on `DevicesScreen`. No change.

**Assumption (flag for backend):** the backend forwards `deviceToken` to **Expo's push service** (not raw FCM/APNs). If the backend instead expects raw FCM/APNs tokens, the spec needs revising — `getDevicePushTokenAsync` returns the native token, and the registration body adds a `tokenType` discriminator.

---

## Notification payload contract

The backend sets `notification.request.content.data` per template. The router accepts the following keys, in priority order:

1. `deepLink` — a string like `iforums://topic/12345?postId=999`. If present, parsed and routed directly.
2. **Specific ID keys** (any present wins; first match in this list):
   - `articleId` → `ArticleDetail`
   - `topicId` (+ optional `postId`) → `TopicDetail`
   - `threadId` → `MessageThread` (private message)
   - `badgeId` → `BadgeDetail`
   - `userId` → `Profile`
3. `templateId` (numeric) — used only for analytics/logging if the keys above are absent.
4. **Fallback** — open `Notifications` list.

```ts
// notificationRouter.ts (sketch)
export type NavTarget =
  | { stack: 'MySpace'; screen: 'Notifications' }
  | { stack: 'MySpace'; screen: 'MessageThread'; params: { threadId: string } }
  | { stack: 'MySpace'; screen: 'BadgeDetail';    params: { badgeId: string } }
  | { stack: 'MySpace'; screen: 'Profile';        params: { userId: string } }
  | { stack: 'Forums';  screen: 'TopicDetail';    params: { topicId: string; focusPostId?: string } }
  | { stack: 'News';    screen: 'ArticleDetail';  params: { articleId: string } };

export function routeFromPayload(data: Record<string, unknown> | null | undefined): NavTarget | null;
```

The function is total: returns `null` only if `data` is empty *and* there is no fallback caller (the listener never passes `null`-ish into nav, it falls back to the Notifications list).

---

## Lifecycle

### Login → register
1. `authStore` login resolves; `isAuthenticated` flips `true`.
2. `PushBootstrap` effect runs. If `pushStore.deviceTokenId` already exists and the cached `expoPushToken` matches the current one, **skip** (idempotent — Expo tokens rarely change).
3. `Notifications.getPermissionsAsync()`. If `undetermined`, call `requestPermissionsAsync()`. If `denied`, set `permissionStatus = 'denied'` and stop. Do **not** retry automatically — user re-enables from settings.
4. `getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId })`. On error, set `lastError` and stop.
5. Build the request body using `Platform.OS`, `Device.deviceName`, `Device.modelName`, `Device.osVersion`, `Constants.expoConfig.version`.
6. `registerDevice(body)`. On success, save `deviceTokenId` to `pushStore` and `expo-secure-store` (key `push.deviceTokenId`).
7. Set Android default channel via `Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: AndroidImportance.HIGH })` so HIGH-priority notifications heads-up correctly.

### Foreground push received
- `setNotificationHandler` returns `{ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }` so an in-app banner appears regardless of which screen the user is on.
- `addNotificationReceivedListener` invalidates:
  - `['notifications']` (list)
  - `['notifications', 'unread-count']`
  - `['messages', 'overview']` (if it's a PM template)

### Tap (foreground / background)
- `addNotificationResponseReceivedListener(response)`:
  1. Read `response.notification.request.content.data`.
  2. `const target = routeFromPayload(data)`; on `null`, fall back to `{ stack: 'MySpace', screen: 'Notifications' }`.
  3. `navigationRef.navigate(target.stack, { screen: target.screen, params: target.params })`.
  4. If `data.notificationId` is present, fire-and-forget `markAsRead({ ids: String(data.notificationId) })` and invalidate the unread-count query.

### Cold start (app launched from a tap, not yet running)
- After `NavigationContainer` reports ready (`onReady`), call `Notifications.getLastNotificationResponseAsync()` once. If non-null and not yet handled by the regular listener (track via a `coldStartHandled` ref), route it.

### Logout
- `authStore.logout` → bootstrap detects `isAuthenticated` flipped `false`.
- If `pushStore.deviceTokenId` exists, fire-and-forget `DELETE /devices/{deviceTokenId}`. Errors are logged but not surfaced (logout shouldn't block).
- Clear `pushStore` and the `expo-secure-store` key.
- `Notifications.setBadgeCountAsync(0)`.
- Tear down listeners (subscriptions).

### Account switch
- Treated as logout-then-login. The bootstrap re-runs registration with the new auth context. Backend will `isNewDevice: false` because the same Expo token already exists for the new user — that's fine.

---

## UI surfaces

### `MySpaceSettings` — new row

```
┌────────────────────────────────────────────────────┐
│ 🔔  Push Notifications                              │
│     Status: On / Off / System permission denied     │
│                                              [▶︎]   │
└────────────────────────────────────────────────────┘
```

- `granted` → show "On" + a chevron that opens an info screen (out of scope for now — chevron is non-interactive in v1) or a placeholder toggle that just opens system settings.
- `denied` → show "System permission denied" + tap `Linking.openSettings()`.
- `undetermined` → show "Off" + tap re-runs the permission request.

This row reads from `pushStore.permissionStatus` and re-checks on focus.

### `NotificationsScreen` — soft banner
If `permissionStatus === 'denied'`, render a small dismissible banner above the filter bar:

> **Turn on push notifications** to get replies and mentions in real time. → *Open settings*

The banner does not block the existing list. Dismissal persists for the session only (no MMKV flag — keeps it simple, comes back next launch if still denied).

---

## Edge cases

| Case | Handling |
|---|---|
| User on a simulator | iOS sim never delivers push. `getExpoPushTokenAsync` throws on iOS sim. We catch, set `lastError = 'simulator'`, skip registration. Manual QA must use a physical device or Android emulator with Google Play Services. |
| Expo Go (vs. dev build) | `getExpoPushTokenAsync` works in Expo Go but only for that Expo Go install (good enough for dev). Document in `mobile/CLAUDE.md`. |
| User denies permission, then enables in OS settings | Bootstrap re-checks `getPermissionsAsync` whenever the app comes to foreground (`AppState` listener). If status flipped to `granted`, run the token+register flow. |
| Token rotates (rare) | Bootstrap stores the last seen Expo token. On every foreground, compare; if changed, re-register. Backend will issue a new `deviceTokenId`; the old one is leaked but is cleaned by the backend's expiry logic. |
| Multiple bootstrap mounts | Bootstrap is in `App.tsx`, mounted once. Listeners are stored in module-level refs and torn down on unmount. A second mount is a noop. |
| 401 on `/devices/register` | Goes through the shared axios refresh path. If refresh fails, surface as `lastError` and let the next login retry. |
| Network offline at login | Registration fails silently, `lastError` set. Bootstrap retries on next foreground. |
| Notification arrives before app finishes booting | Cold-start handler picks it up after `NavigationContainer` is ready. The listener installed during boot also catches it; `coldStartHandled` ref dedupes. |
| Backend payload missing all keys | Router returns `null`; tap handler falls back to Notifications list. |
| `deepLink` URL malformed | Router catches the parse error, falls back to ID keys, then to the list. |
| Backend payload includes both `deepLink` and IDs | `deepLink` wins (documented contract). |
| Tap arrives while logged out | Tap handler checks `authStore.isAuthenticated`; if false, skip nav and clear the system notification. Server will stop pushing after `DELETE /devices/{id}` runs, so this only happens during the in-flight logout window. |

---

## Testing

### Unit (Jest)
- `notificationRouter.test.ts`:
  - Each template's expected payload → expected `NavTarget`.
  - `deepLink` overrides ID keys.
  - Malformed `deepLink` → falls back to ID keys.
  - Empty/`undefined` data → returns `null`.
  - Unknown keys only → returns `null`.

### Manual QA (per platform — tracked as a checklist in the plan)
1. Send a test push from `https://expo.dev/notifications` to the Expo token printed by `pushStore`.
2. **Foreground**: see in-app banner; tap → routes to expected screen.
3. **Background**: lock device, send push; tap notification → app comes forward and routes.
4. **Cold start**: kill app, send push, tap → app launches and routes.
5. **Permission denied**: deny on first prompt, verify banner in `NotificationsScreen` and "denied" state in `MySpaceSettings`. Enable in OS, return to app, verify auto-register.
6. **Logout**: verify backend's device list (next session) does not include the just-removed `deviceTokenId`.

### Automated checks
- `npm run tsc` — must be clean.
- `npm run lint` — must be clean.
- `npm run test` — router tests pass.

---

## Roll-out

This is additive. No existing screens change behavior except `MySpaceSettings` (new row) and `NotificationsScreen` (optional dismissible banner when permission is denied). No DB migration. No backend change required (endpoints already exist). No native rebuild required if we stay within the existing Expo plugin set; adding `expo-device` requires a development build rebuild via EAS — call this out at implementation time.

---

## Open questions for the backend team (non-blocking)

1. Confirm `deviceToken` is forwarded to **Expo Push Service** (not raw FCM/APNs). If raw, we'll need a follow-up to send `getDevicePushTokenAsync` results and a `tokenType` field.
2. Confirm the `data` payload conventions per template — specifically which keys (`topicId`, `postId`, `threadId`, `badgeId`, `userId`, `articleId`, `notificationId`) are populated for which template IDs. The router has documented fallbacks but landing the conventions explicitly would let us tighten the type.
3. Is there a `templateId → display category` mapping the backend can return (or is already in the templates list under `/user-notifications`)? If yes, we can drop the regex-based icon picker in `NotificationsScreen` and key off the real ID.
