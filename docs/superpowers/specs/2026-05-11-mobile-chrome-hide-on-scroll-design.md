# Mobile Chrome Hide-on-Scroll — Design Spec

**Date:** 2026-05-11
**Scope:** mobile app (`mobile/`)
**Status:** Draft — pending user review

---

## 1. Problem

On the mobile app, the top header (`TopNavBrand`) and the bottom tab bar together consume ~120px of vertical space on every tab feed. While the user is reading content, this chrome is not useful — it just shortens the visible content window. Popular content apps (Reddit, Twitter, Instagram) reclaim this space with a "hide chrome on scroll-down, reveal on scroll-up" pattern.

We want the same pattern on our tab feeds.

## 2. Goals

- Maximize visible content area on the tab feeds the user spends most time in.
- Match the established Reddit/Twitter convention so the behavior feels familiar.
- Keep navigation always one upward swipe away — no hidden modes, no tap-to-reveal shortcuts.
- Run the animation on the UI thread so heavy lists (image-led cards on Home, News, Forums) do not jank the chrome.

## 3. Non-Goals

- No change to detail screens (ArticleDetail, ForumThread, ChapterReader, etc.). They keep their static back-button headers.
- No change to `SearchMainScreen`. Its `SearchInputHeader` must stay pinned because the user is actively typing into it.
- No change to non-tab-root screens reached by push (MessagesInbox, Notifications). They are not feeds.
- No change to the existing in-page hide-on-scroll on the forums pagination bar (functional concern preserved; implementation refactored — see §8).
- No tap-to-reveal, no edge-swipe shortcut. Scroll-up is the sole reveal trigger.

## 4. Scope of Affected Screens

The behavior applies to exactly four screens (the four tab-root content feeds):

| Tab | Screen | Top chrome | List |
|---|---|---|---|
| Home | `HomeScreen` | `TopNavBrand` | `FlashList` |
| News | `NewsScreen` | `TopNavBrand` | `FlashList` |
| Forums | `ForumsMainScreen` (via `ForumListView`) | `TopNavBrand` | list inside `ForumListView` |
| MySpace | `MySpaceMainScreen` | `TopNavBrand` | `FlashList` |

Search is explicitly excluded (see §3).

## 5. Behavior

Direction-with-threshold, identical semantics to the existing `useHideOnScroll`:

| State | Trigger | Chrome |
|---|---|---|
| Visible | initial load | both header and tab bar fully shown |
| Hidden | sustained scroll-down with `delta > 8px` past the top buffer | both slide off-screen, fade out (180ms) |
| Re-revealed | any scroll-up with `delta < -8px` | both slide back in, fade in (180ms) |
| Forced visible | scroll position within 80px of top | reset to fully visible |
| Forced visible | scroll position within 60px of bottom | reset to fully visible |
| Forced visible | pull-to-refresh start | reset to fully visible |
| Forced visible | screen gains focus (`useFocusEffect`) | reset to fully visible |

Chrome state is **shared across the four feeds via one `SharedValue`**. Switching tabs always resets to visible via `useFocusEffect`, so a "stale hidden chrome" never surfaces.

## 6. Architecture

A single Reanimated `SharedValue<number>` (`chromeProgress`, range `0..1`) drives the animation on the UI thread. `0` = fully visible, `1` = fully hidden.

```
MainTabNavigator
  └─ <ChromeScrollProvider>            // owns chromeProgress: SharedValue<number>
       ├─ <Tab.Navigator
       │     tabBar={(props) => <AnimatedTabBar {...props} />}>  // reads progress
       │     ├─ HomeStack → HomeScreen
       │     ├─ NewsStack → NewsScreen
       │     ├─ ForumsStack → ForumsMainScreen
       │     ├─ SearchStack → SearchMainScreen          // not plumbed
       │     └─ MySpaceStack → MySpaceMainScreen
       │
       └─ Each plumbed feed screen:
            ├─ <AnimatedTopBar />                       // reads progress
            └─ <Animated.FlashList                       // worklet writes progress
                  onScroll={useScrollChrome().scrollHandler} />
```

- **Producer (screens):** `useScrollChrome()` returns a `useAnimatedScrollHandler` worklet that runs on the UI thread, applies direction/threshold/near-edge logic, and writes to `chromeProgress` via `withTiming(target, { duration: 180 })`.
- **Consumers (chrome):** `useAnimatedStyle` blocks derive `translateY` and `opacity` from `chromeProgress`. No JS re-renders during scroll.

## 7. Files & Changes

### 7.1 New files

All under `mobile/src/components/layout/chromeScroll/`:

| File | Purpose |
|---|---|
| `ChromeScrollContext.tsx` | Creates `chromeProgress: SharedValue<number>` via `useSharedValue(0)`. Exposes it through `ChromeScrollContext` along with `resetChrome()` (sets progress → 0 with `withTiming`). |
| `useScrollChrome.ts` | Returns `{ scrollHandler, resetChrome }`. `scrollHandler` is a `useAnimatedScrollHandler` worklet that tracks `lastY` (in a `useSharedValue`), computes `delta` vs threshold (`8`), applies near-top (`< 80`) / near-bottom (`< 60` from end) overrides, and writes to `chromeProgress` with `withTiming(target, { duration: 180 })`. |
| `AnimatedTabBar.tsx` | Custom `tabBar` prop for `Tab.Navigator`. Wraps `BottomTabBar` from `@react-navigation/bottom-tabs` inside an `Animated.View`. Interpolates `translateY: 0 → (56 + insets.bottom)` and `opacity: 1 → 0` from `chromeProgress`. Uses `onLayout` to measure actual height rather than hardcoding. Sets `pointerEvents="none"` while hidden. Background is solid `colors.card` to prevent ghosting mid-translate. |
| `AnimatedTopBar.tsx` | Wraps `TopNavBrand` in `Animated.View`. Interpolates `translateY: 0 → -(headerHeight + insets.top)` and `opacity: 1 → 0`. Uses `onLayout` for height. Sets `pointerEvents="none"` while hidden. |

### 7.2 Modified files

| File | Change |
|---|---|
| `mobile/src/navigation/MainTabNavigator.tsx` | Wrap `Tab.Navigator` in `<ChromeScrollProvider>`. Replace inline `tabBarStyle` block with `tabBar={(props) => <AnimatedTabBar {...props} />}`. Move existing tab styling tokens (`backgroundColor`, `borderTopColor`, `height`, etc.) into `AnimatedTabBar`. |
| `mobile/src/features/home/screens/HomeScreen.tsx` | Replace bare `<TopNavBrand .../>` with `<AnimatedTopBar .../>`. Define `AnimatedFlashList = Animated.createAnimatedComponent(FlashList)` **at module scope** (never inside the component). Pass `scrollHandler` from `useScrollChrome()` as `onScroll`. Call `resetChrome()` inside `handleRefresh` before invalidating queries. Add `useFocusEffect(() => { resetChrome(); }, [])` to reset on tab focus. |
| `mobile/src/features/news/screens/NewsScreen.tsx` | Same pattern as HomeScreen. |
| `mobile/src/features/forums/screens/ForumsMainScreen.tsx` | Wrap top with `<AnimatedTopBar />`. Plumb `scrollHandler` from `useScrollChrome()` down into `ForumListView` as a new optional prop, or have `ForumListView` consume `useScrollChrome()` directly. Add `useFocusEffect` reset. |
| `mobile/src/features/forums/components/ForumListView.tsx` | See §8 — must compose the new worklet handler with the existing local pagination-bar hide-on-scroll. |
| `mobile/src/features/myspace/screens/MySpaceMainScreen.tsx` | Same plumbing pattern as HomeScreen. |
| `mobile/src/features/forums/hooks/useHideOnScroll.ts` | Rewrite to be worklet-based (see §8). Same outward contract (returns hidden + onScroll + show), but `hidden` becomes a `SharedValue<boolean>` (or `SharedValue<number>` 0/1) and `onScroll` is a `useAnimatedScrollHandler` rather than a JS callback. Consumers of the existing API (`ForumThreadScreen`, `ForumListView`) updated to read via `useAnimatedStyle`. |

### 7.3 Out of scope (intentional)

- Detail screens — they render their own back-button headers and do not need this.
- `SearchMainScreen` — see §3.
- `MessagesInboxScreen`, `NotificationsScreen`, `MessageThreadScreen`, etc. — not tab-root feeds.
- `Stories`, `Shorts`, `WebStoryPlayer`, `QuizPlayer` — immersive content with their own chrome rules.

## 8. Composing with the Existing Forums Pagination Bar

`ForumListView` already uses `useHideOnScroll` (JS-thread state) to auto-hide its in-page pagination bar. The new app chrome behavior needs to attach a `useAnimatedScrollHandler` worklet to the same scrollable list. Two scroll handlers cannot be attached to the same list, and a JS `onScroll` prop does not compose with a Reanimated worklet handler.

**Decision: rewrite `useHideOnScroll` as a worklet.**

After the rewrite:
- `useHideOnScroll` returns `{ hidden: SharedValue<number>, onScroll: useAnimatedScrollHandler, show: () => void }`.
- `ForumListView` calls *both* `useScrollChrome()` and `useHideOnScroll()`, then composes them into one handler:

  ```ts
  const chrome = useScrollChrome();
  const localBar = useHideOnScroll();
  const handler = useAnimatedScrollHandler((e) => {
    'worklet';
    chrome.scrollHandler.onScroll(e);
    localBar.onScroll.onScroll(e);
  });
  ```

  (or each handler is invoked as a worklet function directly; exact API surface to be finalized at implementation time)

- `ForumPaginationBar` is updated to consume `hidden` via `useAnimatedStyle` rather than as a boolean prop.
- `ForumThreadScreen` (the other consumer of `useHideOnScroll`) gets the same treatment for its local bar.

**Rejected alternative:** bridge via `runOnJS` from inside the worklet. Cheaper to implement but defeats the UI-thread benefit by paying a JS bridge cost on every scroll event.

## 9. Edge Cases & Behavior Details

| Case | Behavior |
|---|---|
| Scroll near top (`y < 80`) | Force `chromeProgress → 0`. Prevents flicker on bounce/overscroll. |
| Scroll near bottom (within 60px of end) | Force `chromeProgress → 0`. End-of-list CTAs (e.g. Home "VIEW ALL", end-of-feed) remain reachable. |
| Pull-to-refresh | `handleRefresh` calls `resetChrome()` so the refresh indicator and the top bar appear together. |
| Tab switch | Each feed screen calls `resetChrome()` inside `useFocusEffect`. Programmatic navigation (deep links, push-notification taps via `notificationRouter`) is covered because focus events fire for all entry paths. |
| Navigate to detail screen | Detail screens render their own back-button header; they do not read `chromeProgress`, so nothing visible happens. On return via `goBack`, the feed's `useFocusEffect` runs again and resets. |
| Keyboard opens on Search | Search is excluded from the behavior. No interaction. |
| Theme toggle / dark mode | Animated styles touch only `translateY` and `opacity`. Color tokens still flow from `useThemeStore` to the wrapped `TopNavBrand` / `BottomTabBar` without disruption. |
| Empty list / loading state | No scroll → `chromeProgress` stays `0` → chrome visible. Correct. |
| Short content (no scroll possible) | `delta` stays `0` → `chromeProgress` stays `0`. Correct. |
| Fast flick / momentum scroll | `withTiming(180ms)` smooths transitions; threshold (`8px`) absorbs noise; UI-thread worklet means no jank even mid-flick. |
| Horizontal carousels nested in the feed (`FeaturedBannerCarousel`, `StoriesStrip`, `CategoryChips`) | Unaffected. The worklet is attached only to the outer vertical `FlashList`. Nested horizontal scrollables do not fire its handler. |
| Accessibility | Wrapping `Animated.View`s preserve their child's `accessibilityLabel`. Both `AnimatedTopBar` and `AnimatedTabBar` set `pointerEvents="none"` and rely on opacity → 0 to remove themselves from the accessibility tree while hidden. |
| Status bar | Unaffected. The OS status bar background is independent of the header View on both iOS and Android. Existing app uses a single theme background, so no perceptible mismatch. |

## 10. Implementation Notes

These are gotchas the implementer must respect — calling them out so they are not rediscovered the hard way:

1. **`Animated.createAnimatedComponent(FlashList)` must be defined at module scope**, not inside the component body. Defining it inside would recreate the wrapper on every render and FlashList would lose its list state.
2. **Translate distance must include safe-area inset**, not just the visible bar height. Use `onLayout` to measure the actual height of each chrome element rather than hardcoding `56` or `44`. This is essential for the chrome to fully disappear on iPhones with a notch and Androids with a tall status bar.
3. **`useFocusEffect`, not `tabPress` listener**, for the visibility reset. `tabPress` fires only on user tab taps and not on programmatic navigation (deep links, push-notification taps). `useFocusEffect` covers every entry path.
4. **`AnimatedTabBar` background must be opaque** (`colors.card`). Any transparency causes ghosting while the bar is mid-translate.
5. **Compose worklets via worklet calls, not JS bridge.** The Forums case in §8 is the only place this composition is needed; do not introduce `runOnJS` shims elsewhere.

## 11. Testing & Verification

No automated tests exist in this app yet (Jest configured, zero test files committed) and the behavior is animation-driven, so verification is manual with TypeScript and lint as the only automated gates.

### 11.1 Automated gates

- `npm run tsc` must pass (per `mobile/CLAUDE.md` requirement before declaring tasks done).
- `npm run lint` must pass.

### 11.2 Manual verification — run on iOS and Android

For each of the 4 plumbed feed screens (Home, News, Forums, MySpace):

1. Scroll down past threshold → header slides up off-screen, tab bar slides down off-screen, both fade out. Both finish within ~180ms.
2. Scroll back up by any amount → both reappear smoothly, no overshoot.
3. Pull-to-refresh while chrome is hidden → chrome resets to visible before the spinner appears.
4. Reach end of list → chrome auto-reveals (CTAs reachable).
5. Stop near the top (`y < 80`) → chrome stays visible regardless of micro-scrolls.
6. Tap a tab while another tab has hidden chrome → switched tab opens with chrome fully visible.
7. Push to a detail screen, navigate back → returning to feed shows chrome fully visible.
8. Fast flick test → no jank, no flash of mid-translate state stuck on screen.

### 11.3 Regression checks

- Forums' local pagination-bar hide-on-scroll still works (verified by §8 worklet rewrite test).
- Tab badge dots (Forums notif, MySpace unread) still render correctly inside `AnimatedTabBar`.
- SideMenu drawer still opens via the hamburger inside the animated header.
- Tab bar height + safe-area inset spacing unchanged when chrome is visible.
- `SearchMainScreen` is untouched and behaves identically to before.
- `MessagesInboxScreen` and `NotificationsScreen` (reached via push from MySpace) are untouched.

### 11.4 Performance budget

- JS-thread FPS ≥ 58 during fast Home-feed flick on a mid-range Android.
- UI-thread FPS pinned at 60.
- Verified via React Native dev menu → Show Perf Monitor.

## 12. Open Questions

None. Spec is ready for implementation planning.
