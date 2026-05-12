# Mobile Frontend — Open Issues & Tech Debt

**Date:** 2026-05-12
**Scope:** `mobile/` (Expo 55 / React Native 0.83 / TypeScript)
**Surfaced from:** push-notifications feature delivery + 8 EAS builds of QA on `feat/celebrity-profile-tier1`

Companion to `backend-issues-notifications-2026-05-12.md`. The backend doc lists what we need from the API team; this doc lists what we need to clean up in the client. Same severity tiers.

---

## Critical — affects shipping or daily development

### 1. `npm run lint` is broken project-wide
**File:** `mobile/package.json`

```
"lint": "eslint . --ext .ts,.tsx"
```

The project upgraded to ESLint v9 (which dropped the `--ext` flag) but the script wasn't updated and there's no `eslint.config.js` at the repo root. Running `npm run lint` always fails before lint even gets to look at code.

**Impact:** we've shipped 8 builds with zero lint coverage. ESLint catches a lot of React-hooks rules violations, unused vars, and bad import patterns — none of which we're checking.

**Action:** add an `eslint.config.js` (v9 flat-config format), drop `--ext` from the script, and integrate `@react-native-community/eslint-config` or `eslint-config-expo`. Probably half a day of work.

### 2. No CI / no pre-push gates
The repo has no CI. There's no automated `tsc`, no test run, no lint, no build verification before merging or pushing. Engineers are on the honor system for running `npm run tsc` and `npx jest` locally — and we've already merged commits where `tsc` was momentarily failing.

**Action:** add GitHub Actions (or whatever VCS provides) that runs `tsc`, jest, and a basic Expo build verification on every PR.

### 3. No error boundaries
Documented in `mobile/CLAUDE.md`: *"No error boundaries yet. Throws crash the whole screen."*

A single uncaught render error in a notification row, a card, or a tab takes down the entire screen — and on cold start, the entire app. Push-tap → bad payload → crash on a brand-new user's first session is a real risk.

**Action:** wrap each screen (or at minimum each tab's root) in a React error boundary that catches, logs to a sink, and shows a "Something went wrong — tap to retry" fallback.

### 4. Test coverage is effectively 0%
After this work, the codebase has exactly **one** test file: `mobile/src/services/notificationRouter.test.ts` (29 unit tests). The other ~270 source files have zero coverage.

**Impact:** every refactor is high-risk because we can't tell what we broke. The cold-start bug (issue caught in code review) would have been a runtime exception had it slipped through.

**Action:** at minimum, add unit tests for all pure utility modules (`services/notificationRouter.ts`, `utils/format.ts`, anything in `*/utils/`). Then move to integration tests for hooks.

### 5. Tests are excluded from `tsc`
**File:** `mobile/tsconfig.json`

```jsonc
"exclude": ["node_modules", "**/*.test.ts", "**/*.test.tsx"]
```

We had to add this exclude because jest globals (`describe`, `test`, `expect`) weren't typed and `@types/jest` wasn't installed. Now it is, but the exclude was left in. Result: **test files are never type-checked.**

**Action:** remove the exclude lines now that `@types/jest` is in `package.json`.

### 6. `services/api.ts` is a 4000+ line god file
Already documented in `mobile/CLAUDE.md`, but it keeps growing — we added `fetchTopicPosts` references and the file now holds the axios client, error extractor, category maps, *and* transformers for several domains.

**Impact:** every change to one endpoint risks colliding with merges from another feature. Hot file in bug surface.

**Action:** split per domain following the precedent of `authApi.ts` and `userProfileApi.ts`. New endpoints should never land in `services/api.ts` going forward.

---

## Important — slows development or causes user-visible bugs

### 7. Hook-regenerated tracking docs always dirty
**Files:** `docs/tracking/mobile-development-progress.md`, `docs/tracking/screen-checklist.json`

A save-hook regenerates these on every mobile file change. They end up modified in git after every implementer dispatch. We had to manually decide each commit whether to include them. They've contaminated multiple commits with unrelated noise.

**Action:** either (a) don't commit them at all (add to `.gitignore`), or (b) commit them in a dedicated chore commit on a schedule, or (c) generate them at build time only.

### 8. Navigation depth assumed in deep-link helpers
**File:** `mobile/src/features/notifications/hooks/useNotificationBell.ts`

```ts
(navigation.getParent()?.getParent() as any)?.navigate('Main', { screen: 'MySpace', params: { screen: 'Notifications' } });
```

We rely on the navigation tree being exactly two levels deep. If a screen mounts under a third stack (e.g., inside a modal), this silently fails.

**Action:** export the `navigationRef` from `RootNavigator` and use it consistently from non-React code, or build a typed deep-link service that doesn't traverse parents.

### 9. `TopicDetail` (and `MovieDetail`, `ShowDetail`, etc.) require full domain objects in nav params
**File:** `mobile/src/navigation/types.ts`

Screens expect a complete `ForumTopic` / `Movie` / `Show` object, not just an id. This forces every deep-link path to fetch the object first and then navigate. We had to add `NotificationDispatchScreen` purely as a shim because the notification payload only has an id.

**Impact:** every new deep-link entry point needs its own shim screen. Compounds across web-link / push / share / Spotlight search integrations.

**Action:** every detail screen should accept either `{ object }` or `{ id }` — the screen fetches on mount when only an id is passed. The pattern `GalleryDetail` already uses ((`{ gallery }` | `{ id, … }`) is the right one.

### 10. `platform: 'ios' | 'android'` typed client-side but backend takes any string
**File:** `mobile/src/features/profile/types.ts`

We narrowed `platform` to two literals client-side, but the backend's OpenAPI schema is `platform: string`. If the backend ever rejects values it doesn't recognize, or if we add a web platform, we'll hit a runtime mismatch.

**Action:** loosen the client type to `string` to match the wire format, *or* push the backend to enum it (see backend issue #39).

### 11. `stripHtml` used across many features
**Files:** imported from `features/profile/utils/format.ts` in 8+ files

The `stripHtml` helper is in the profile feature's utils but is used in notifications, messages, search results, and home. Cross-feature coupling for what should be a shared utility.

**Action:** move `stripHtml`, `timeAgo`, and any other generic string/date helpers to `mobile/src/utils/` or `mobile/src/lib/`.

### 12. Static-data fixtures still ship instead of API
Documented in `mobile/CLAUDE.md`: *"Static data in `features/*/data/` (e.g. `galleries.ts`, `webStories.ts`) is intentional for now."*

This was intentional during prototyping but several screens still use baked-in data that drifts from the live backend. Stories, galleries, web stories all have static fallbacks.

**Action:** replace fixtures with live API integration screen-by-screen, or at least add a `__DEV__` guard so production builds can't accidentally ship with fixtures.

### 13. No skeleton loaders — bare `<ActivityIndicator>` everywhere
Empty states during query loads show a spinner in the middle of a blank screen. Modern apps use content-shaped skeletons that prevent layout shift and feel faster.

The empty-chip bug we hit during notifications would have been easier to diagnose if chip slots had a skeleton variant — we'd have seen "5 chips are loading" instead of "5 chips rendered empty."

**Action:** add a `Skeleton` primitive (animated shimmer rectangles) and use it for list rows, cards, and chip strips while data is loading.

### 14. `useRef` mutation in render
**File:** `mobile/src/features/notifications/screens/NotificationsScreen.tsx`

```ts
const autoAdvanceCount = useRef(0);
// ...later, inside useEffect:
autoAdvanceCount.current += 1;
```

That specific case is fine because the increment is inside `useEffect`, but the `autoAdvanceCount.current >= 5` check is read in the empty-state JSX (during render) — reading a ref during render is a yellow flag because the value can change between renders without triggering a re-render.

**Action:** for values consumed in JSX, convert to `useState`. Reserve refs for values only read inside callbacks/effects.

### 15. `useInboxCounts` polls every 5 minutes — no real-time channel
**File:** `mobile/src/features/notifications/hooks/useNotifications.ts`

```ts
refetchInterval: 5 * 60_000
```

The badge can be up to 5 minutes stale. This is partly a backend gap (see backend issue #32) but the client could compensate with smarter invalidation:
- Refetch on AppState `active`
- Refetch on screen focus
- Refetch immediately after `markAsRead` mutation (we do this — good)

**Action:** add focus + AppState refetch hooks.

### 16. Cold-start tap handling is fragile
**Files:** `mobile/App.tsx` + `mobile/src/services/pushNotifications.ts`

`handleColdStartTap` is wired via `NavigationContainer.onReady`. Works, but the order of operations is implicit:
1. App boots
2. NavigationContainer mounts and reports ready
3. `onReady` calls `handleColdStartTap`
4. Cold-start tap reads `useAuthStore.getState().isAuthenticated`
5. If auth not yet hydrated → fails silently

We've added a guard, but a cold-start push that arrives before auth hydration completes will still drop the tap.

**Action:** queue cold-start taps in `pushStore`, replay after auth hydration completes.

### 17. Theme tokens are untyped strings
**File:** `mobile/src/theme/tokens.ts`

```ts
export interface ThemeColors {
  primary: string;
  primarySoft: string;
  textSecondary: string;
  // ...50+ more
}
```

All colors typed as `string`. No semantic grouping — `c.primary` (a brand color) and `c.text` (a content color) are interchangeable as far as TypeScript is concerned. A small confusion like "I'll use `c.primarySoft` for the chip background" was the root cause of the empty-chip styling investigation.

**Action:** wrap tokens in branded types or namespace by use case (`c.brand.primary`, `c.text.secondary`, `c.surface.card`).

### 18. `placeholderData: keepPreviousData` mixes stale + fresh data invisibly
**Multiple React Query call sites**

When a query is refetching with `keepPreviousData`, the UI continues to show the previous result without any visual indicator that data is stale. Users see counters that are 1–5 minutes old without knowing.

**Action:** when `isPlaceholderData` is true, show a subtle "refreshing" indicator (spinner in the corner, dimmed badge, etc.).

### 19. Push permission denial UX is sparse
**File:** `mobile/src/features/notifications/screens/NotificationsScreen.tsx`

If the user denies permission, we show a single banner ("Turn on push notifications…") that opens system settings. Modern apps:
- Show a primer screen *before* requesting permission, explaining the value
- Re-prompt at smart moments (after first message, after first @mention)
- Offer an in-app "test notification" button so the user can verify it works

**Action:** add a permission primer flow.

### 20. Auto-paginate could miss unread items if `totalPages > 5`
**File:** `mobile/src/features/notifications/screens/NotificationsScreen.tsx`

Our Unread-tab logic auto-advances up to 5 pages looking for unread items. If a user has 7 pages of read items followed by 1 unread, we'll never find it.

**Action:** raise cap to e.g. 20, or implement true server-side filtering once backend issue #10 is resolved.

### 21. `MMKV` is required via `require()` not import
Documented in `mobile/CLAUDE.md`: *"MMKV via `require()` in some stores — works, but ties platform gating into the store layer."*

Inconsistent with the rest of the codebase that uses ESM imports.

**Action:** consolidate platform-gated imports into a `mobile/src/platform/` shim layer.

### 22. `Constants.expoConfig?.extra?.eas?.projectId` path is SDK-version-dependent
**File:** `mobile/src/services/pushNotifications.ts`

The path Expo uses to expose `projectId` has changed multiple times across SDK versions (sometimes `Constants.easConfig.projectId`, sometimes `Constants.expoConfig.extra.eas.projectId`). We have defensive code that checks both, but it's a maintenance burden.

**Action:** when bumping Expo SDK, audit and update the path. Or use `expo-application` if it ever exposes the project id directly.

### 23. Hooks reach across feature boundaries
**Example:** `useNotificationBell` (in `features/notifications`) is consumed by Home / News / Forums / Search screens.

Architecturally fine for shared concerns, but currently we don't have a clear convention for "what's allowed to import from another feature." The `useNotificationBell` hook could just as easily belong in `mobile/src/hooks/` (cross-feature).

**Action:** establish a convention: anything imported across feature boundaries lives in `mobile/src/hooks/`, `mobile/src/lib/`, or `mobile/src/components/`. Anything inside `features/<feature>/` is for that feature only.

---

## Nice to have — polish + observability

### 24. No analytics / telemetry on notification interactions
Can't answer questions like:
- What % of pushes get tapped?
- Which template gets the highest engagement?
- How long after a push does the user open the app?

**Action:** add a lightweight analytics shim (Segment / Amplitude / first-party `/analytics`) and instrument tap, dismiss, mark-read, navigate.

### 25. No offline-first cache for notifications
If the user opens the app offline, the Notifications screen shows an error instead of the last-cached list. React Query supports persistent caching via `persistQueryClient` — we'd just need to wire it.

**Action:** add `@tanstack/query-async-storage-persister` for the notifications, messages, and inbox-counts queries.

### 26. No notification grouping in the UI
Even if the backend adds grouping metadata (see backend issue #27), the mobile UI doesn't visually collapse 5 "tagged you in a post" notifications from the same user into one row. Could compress the list a lot.

**Action:** group consecutive same-template same-actor rows under a single expandable row.

### 27. No haptic feedback on notification tap
A small detail but expected — tapping a notification row should fire `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`.

### 28. No sound / vibration pattern config
`Notifications.setNotificationChannelAsync` is called but with default sound and a fixed vibration pattern. Users have no way to customize per-template (e.g., silent for badges, loud for DMs).

**Action:** add a notification-channel-per-template scheme once backend issue #26 lands.

### 29. No accessibility audit
Many `<Pressable>` and `<TouchableOpacity>` lack `accessibilityLabel` or `accessibilityHint`. Notification rows likely don't announce templates/contents correctly to screen readers.

**Action:** sweep with the `eslint-plugin-react-native-a11y` plugin once lint is fixed (issue #1).

### 30. No internationalization
All UI strings are hard-coded English. Even though the app is India-focused, Hindi (and regional languages) speakers are a real audience.

**Action:** introduce `react-i18next` or `expo-localization` + a `t()` helper. Big undertaking — flag as roadmap.

### 31. No dark-mode contrast audit on chips, banners
The empty-chip investigation surfaced that `c.primary` text on `c.primarySoft` background works at typical contrast but compressed by `flexShrink` it became unreadable. We haven't manually audited dark mode for similar issues.

**Action:** run all key surfaces through a contrast checker (axe-react-native or manual against WCAG AA).

### 32. No animation when notifications arrive
Real-time-feel apps animate new items into the list (slide-in from top, highlight pulse, etc.). Currently new notifications just appear on the next refresh.

### 33. No "shake to report a bug" or in-app feedback channel
Documented gap. We expect QA + early adopters to file bugs against a notification feature but have no channel.

**Action:** integrate `expo-shake` (or similar) to open a quick feedback form.

### 34. No persisted onboarding state for push permission
If the user dismisses the permission-denied banner once, it comes back next session. Not catastrophic but mildly annoying.

**Action:** persist `bannerDismissed` to `pushStorage` so it survives app restart (currently only in-memory Zustand).

### 35. No keyboard handling on Compose screen for thread reply
Off-topic from notifications but adjacent — the message Compose screen doesn't scroll above the keyboard.

### 36. No deep-link to settings sub-rows
Tapping a push for "notifications turned off" should open `MySpaceSettings → Push notifications` row directly. Currently it opens `MySpaceSettings` and the user has to find the row.

**Action:** add deep-link routes for settings sub-rows.

### 37. No "view profile" from notification row
Long-pressing a notification could offer "View `pareshif`'s profile" — currently the long-press shows debug info (we added this temporarily).

**Action:** replace the debug long-press with a sheet that has View Profile / Mute / Mark as read / Delete options.

### 38. The `expo-secure-store` fallback is brittle
**File:** `mobile/src/services/pushStorage.ts`

```ts
try {
  return require('expo-secure-store') as SecureAdapter;
} catch {
  return memSecure;
}
```

A try/catch around a `require` — works but masks legitimate errors. If `expo-secure-store` fails to initialize for some other reason, we silently fall back to in-memory and the user's `deviceTokenId` doesn't persist across restarts.

**Action:** prefer ESM dynamic imports with explicit platform checks.

### 39. Web platform support is incidental
The project includes `web` as a Metro bundler target, but most features (push notifications, MMKV, native modules) silently no-op on web. Users on web see a degraded experience without explicit handling.

**Action:** decide if web is in scope. If yes, add proper feature detection and fallbacks. If no, drop the web target.

### 40. Reanimated worklets in chrome scroll
The `chromeScroll` system uses Reanimated 4 worklets. Powerful but adds debugging complexity (worklets don't show stack traces normally). One recent commit had to fix `pointerEvents` interaction with worklets.

**Action:** document worklet patterns in `mobile/CLAUDE.md` so future engineers don't have to reverse-engineer.

---

## Confirmed working — for reference

These behaviors are working correctly and don't need attention:

- React Query infrastructure (retry policy, error handling, cache invalidation patterns)
- Axios client with single-flight token refresh
- Zustand stores for auth, theme, notifications, push
- Bottom tab navigation + nested stack navigation
- The notification router itself (29 unit tests, 100% of router logic covered)
- The push notification service (registration, listener install, foreground handler, cold-start handler)
- EAS development build pipeline (Android APK)
- Theme switching (light/dark)
- Pull-to-refresh on all list screens

---

## Suggested priority order for frontend

**Tier 1 — Fix before next sprint (development-blockers)**
1. **Issue 1** — Fix `npm run lint`. Without it, code quality declines silently.
2. **Issue 2** — Add CI so issue 1 stays fixed.
3. **Issue 3** — Add error boundaries. One uncaught throw shouldn't kill the app.
4. **Issue 5** — Re-include test files in `tsc`.
5. **Issue 6** — Stop adding to `services/api.ts`.

**Tier 2 — Address this quarter (user-visible quality)**
6. **Issues 7, 8, 9, 11** — clean up architecture: tracking-doc dirt, nav-tree fragility, id-only nav params, shared utils.
7. **Issues 13, 19, 22** — UX polish: skeletons, permission primer, SDK-version-proofing.
8. **Issue 15** — refresh badge on focus instead of just timed poll.

**Tier 3 — Roadmap**
- Everything 24–40. Polish features, observability, i18n. None block the current feature; each unblocks a future one.

---

## Total issue count by tier

| Severity | Count | Issues |
|---|---|---|
| Critical | 6 | #1–6 |
| Important | 17 | #7–23 |
| Nice to have | 17 | #24–40 |
| **Total** | **40** | |
