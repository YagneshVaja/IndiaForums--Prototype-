# Mobile Chrome Hide-on-Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the top header (`TopNavBrand`) and the bottom tab bar when the user scrolls down on the four content-feed tabs (Home, News, Forums, MySpace), and reveal them again on any upward scroll — Reddit/Twitter style, animated on the UI thread.

**Architecture:** A single Reanimated `SharedValue<number>` (`chromeProgress`, `0..1`) lives in a `ChromeScrollContext` mounted at the `MainTabNavigator` root. A worklet scroll handler on each feed's list writes the value; the wrapped header (`AnimatedTopBar`) and custom tab bar (`AnimatedTabBar`) read it via `useAnimatedStyle`. Animation runs entirely on the UI thread — no JS bridge cost on scroll.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript (strict), React Navigation v6 (`@react-navigation/bottom-tabs`, `@react-navigation/native-stack`), Reanimated 4, FlashList (Home, Forums via list), FlatList (Forums inner list), ScrollView (News, MySpace).

**Spec:** [../specs/2026-05-11-mobile-chrome-hide-on-scroll-design.md](../specs/2026-05-11-mobile-chrome-hide-on-scroll-design.md)

**Testing reality:** The mobile app has no committed tests (Jest configured, zero `.test.*` files). Verification gates for each task are `npm run tsc` + `npm run lint` + manual scroll test. TDD is not viable here; this plan substitutes explicit manual verification steps for failing-tests-first.

**Commit policy:** The user's standing rule is "always ask before committing". Every `git commit` step in this plan must pause and ask the user before executing the `git commit` line.

---

## File Layout

```
mobile/src/components/layout/chromeScroll/         (new)
├── ChromeScrollContext.tsx      Provider + useChromeScroll() hook
├── useScrollChrome.ts           Worklet scroll handler + resetChrome
├── AnimatedTopBar.tsx           Wraps TopNavBrand
└── AnimatedTabBar.tsx           Custom Tab.Navigator tabBar prop

Modified:
mobile/src/navigation/MainTabNavigator.tsx
mobile/src/features/home/screens/HomeScreen.tsx
mobile/src/features/news/screens/NewsScreen.tsx
mobile/src/features/forums/screens/ForumsMainScreen.tsx
mobile/src/features/forums/components/ForumListView.tsx
mobile/src/features/forums/components/ForumPaginationBar.tsx
mobile/src/features/forums/screens/ForumThreadScreen.tsx
mobile/src/features/forums/hooks/useHideOnScroll.ts     (rewritten as worklet)
mobile/src/features/myspace/screens/MySpaceMainScreen.tsx
```

---

### Task 1: ChromeScrollContext + Provider

**Files:**
- Create: `mobile/src/components/layout/chromeScroll/ChromeScrollContext.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

interface ChromeScrollContextValue {
  /** 0 = chrome fully visible, 1 = chrome fully hidden. UI-thread shared value. */
  chromeProgress: SharedValue<number>;
  /** Force the chrome back to visible (used on tab focus, pull-to-refresh, etc.). */
  resetChrome: () => void;
}

const ChromeScrollContext = createContext<ChromeScrollContextValue | null>(null);

export function ChromeScrollProvider({ children }: { children: React.ReactNode }) {
  const chromeProgress = useSharedValue(0);

  const value = useMemo<ChromeScrollContextValue>(
    () => ({
      chromeProgress,
      resetChrome: () => {
        chromeProgress.value = withTiming(0, { duration: 180 });
      },
    }),
    [chromeProgress],
  );

  return (
    <ChromeScrollContext.Provider value={value}>
      {children}
    </ChromeScrollContext.Provider>
  );
}

export function useChromeScroll(): ChromeScrollContextValue {
  const ctx = useContext(ChromeScrollContext);
  if (!ctx) {
    throw new Error('useChromeScroll must be used inside <ChromeScrollProvider>.');
  }
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS (the new file should compile cleanly; nothing imports it yet).

- [ ] **Step 3: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 4: Ask user, then commit**

Ask the user to approve the commit. After approval:

```bash
git add mobile/src/components/layout/chromeScroll/ChromeScrollContext.tsx
git commit -m "feat(mobile): add ChromeScrollContext for hide-on-scroll chrome"
```

---

### Task 2: useScrollChrome hook (worklet handler)

**Files:**
- Create: `mobile/src/components/layout/chromeScroll/useScrollChrome.ts`

- [ ] **Step 1: Write the file**

```ts
import { useSharedValue, useAnimatedScrollHandler, withTiming } from 'react-native-reanimated';
import type { NativeScrollEvent } from 'react-native';
import { useChromeScroll } from './ChromeScrollContext';

const SCROLL_THRESHOLD = 8;          // px of delta required to commit a direction
const NEAR_TOP_PX = 80;              // px below content top where chrome stays visible
const NEAR_BOTTOM_PX = 60;           // px above content bottom where chrome stays visible
const ANIM_DURATION_MS = 180;

/**
 * Drives `chromeProgress` (0 = visible, 1 = hidden) on the UI thread using
 * direction + threshold + near-edge logic.
 *
 * Returns:
 *   - `scrollHandler`: ready-to-attach `useAnimatedScrollHandler` — use this
 *     on screens where the list has no other scroll handler (Home, News,
 *     MySpace).
 *   - `applyScroll`: worklet function — call from inside a hand-rolled
 *     `useAnimatedScrollHandler` to compose with another scroll writer
 *     (used by Forums, where the pagination bar also writes to scroll).
 *   - `resetChrome`: JS function to force chrome back to visible (focus,
 *     refresh, manual show).
 */
export function useScrollChrome() {
  const { chromeProgress, resetChrome } = useChromeScroll();
  const lastY = useSharedValue(0);

  function applyScroll(e: NativeScrollEvent) {
    'worklet';
    const y = e.contentOffset.y;
    const layoutH = e.layoutMeasurement.height;
    const contentH = e.contentSize.height;
    const delta = y - lastY.value;
    lastY.value = y;

    const nearTop = y < NEAR_TOP_PX;
    const nearBottom = y + layoutH >= contentH - NEAR_BOTTOM_PX;

    if (nearTop || nearBottom) {
      if (chromeProgress.value !== 0) {
        chromeProgress.value = withTiming(0, { duration: ANIM_DURATION_MS });
      }
      return;
    }

    if (delta > SCROLL_THRESHOLD && chromeProgress.value !== 1) {
      chromeProgress.value = withTiming(1, { duration: ANIM_DURATION_MS });
    } else if (delta < -SCROLL_THRESHOLD && chromeProgress.value !== 0) {
      chromeProgress.value = withTiming(0, { duration: ANIM_DURATION_MS });
    }
  }

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyScroll(e);
    },
  });

  return { scrollHandler, applyScroll, resetChrome };
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 4: Ask user, then commit**

```bash
git add mobile/src/components/layout/chromeScroll/useScrollChrome.ts
git commit -m "feat(mobile): add useScrollChrome worklet handler"
```

---

### Task 3: AnimatedTopBar wrapper

**Files:**
- Create: `mobile/src/components/layout/chromeScroll/AnimatedTopBar.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { TopNavBrand } from '../TopNavBar';
import { useChromeScroll } from './ChromeScrollContext';

type TopNavBrandProps = React.ComponentProps<typeof TopNavBrand>;

/**
 * Wraps `TopNavBrand` in an Animated.View that translates up and fades out
 * as `chromeProgress` goes 0 → 1. Height is measured via `onLayout` so the
 * translation includes the status-bar safe-area inset and the bar fully
 * disappears on devices with a notch or tall status bar.
 */
export default function AnimatedTopBar(props: TopNavBrandProps) {
  const { chromeProgress } = useChromeScroll();
  const [height, setHeight] = useState(0);

  const animStyle = useAnimatedStyle(() => {
    const ty = interpolate(
      chromeProgress.value,
      [0, 1],
      [0, -height],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      chromeProgress.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: ty }],
      opacity,
    };
  }, [height]);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h !== height) setHeight(h);
  };

  // pointerEvents is bound to the *visible* state to avoid swallowing
  // taps on content underneath while chrome is hidden.
  const pointerEventsStyle = useAnimatedStyle(() => ({
    // @ts-expect-error pointerEvents is a valid animated style prop in RN 0.71+
    pointerEvents: chromeProgress.value > 0.95 ? 'none' : 'auto',
  }));

  return (
    <Animated.View
      onLayout={onLayout}
      style={[styles.wrap, animStyle, pointerEventsStyle]}
    >
      <TopNavBrand {...props} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
```

> **Note:** Because `AnimatedTopBar` is absolutely positioned (so it can translate over the list), each feed screen needs top-padding equal to its measured height. We handle this in the per-screen tasks (7, 8, 9, 10) by reading the layout via a callback prop or by adding a fixed spacer. Cleanest: emit measured height back to the screen via an `onMeasure` prop. See Step 2.

- [ ] **Step 2: Add `onMeasure` callback prop**

Update the file to optionally publish the measured height:

```tsx
interface Props extends TopNavBrandProps {
  /** Receives the measured chrome height so the screen can pad its content. */
  onMeasure?: (height: number) => void;
}

export default function AnimatedTopBar({ onMeasure, ...brandProps }: Props) {
  // ... rest unchanged, but in onLayout also call onMeasure:
  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h !== height) {
      setHeight(h);
      onMeasure?.(h);
    }
  };
  // ...
  return (
    <Animated.View onLayout={onLayout} style={[styles.wrap, animStyle, pointerEventsStyle]}>
      <TopNavBrand {...brandProps} />
    </Animated.View>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 5: Ask user, then commit**

```bash
git add mobile/src/components/layout/chromeScroll/AnimatedTopBar.tsx
git commit -m "feat(mobile): add AnimatedTopBar wrapper for hide-on-scroll header"
```

---

### Task 4: AnimatedTabBar custom tab bar

**Files:**
- Create: `mobile/src/components/layout/chromeScroll/AnimatedTabBar.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { useChromeScroll } from './ChromeScrollContext';

/**
 * Custom `tabBar` prop for `Tab.Navigator`. Wraps the default `BottomTabBar` in
 * an Animated.View that translates down and fades out as `chromeProgress`
 * goes 0 → 1. Translation distance equals the measured height (which includes
 * the bottom safe-area inset).
 */
export default function AnimatedTabBar(props: BottomTabBarProps) {
  const { chromeProgress } = useChromeScroll();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const [height, setHeight] = useState(56 + insets.bottom); // sane initial guess

  const animStyle = useAnimatedStyle(() => {
    const ty = interpolate(
      chromeProgress.value,
      [0, 1],
      [0, height],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      chromeProgress.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: ty }],
      opacity,
    };
  }, [height]);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h !== height) setHeight(h);
  };

  return (
    <Animated.View
      onLayout={onLayout}
      // Solid background prevents content ghosting mid-translate.
      style={[styles.wrap, { backgroundColor: colors.card }, animStyle]}
    >
      <View style={styles.barInner}>
        <BottomTabBar {...props} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barInner: {
    // BottomTabBar paints its own background; the wrap's bg is just for
    // anti-ghost during translate.
  },
});
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 4: Ask user, then commit**

```bash
git add mobile/src/components/layout/chromeScroll/AnimatedTabBar.tsx
git commit -m "feat(mobile): add AnimatedTabBar custom tab bar wrapper"
```

---

### Task 5: Wire MainTabNavigator with provider + custom tabBar

**Files:**
- Modify: `mobile/src/navigation/MainTabNavigator.tsx`

The existing `tabBarStyle` block must move into `AnimatedTabBar`'s wrapped `BottomTabBar` config, and we must wrap the whole navigator in `<ChromeScrollProvider>` while passing a custom `tabBar` prop.

- [ ] **Step 1: Modify the file**

Add imports at the top:

```tsx
import { ChromeScrollProvider } from '../components/layout/chromeScroll/ChromeScrollContext';
import AnimatedTabBar from '../components/layout/chromeScroll/AnimatedTabBar';
```

Replace the existing `return (...)` JSX body (from `<>` to `</>`) with:

```tsx
return (
  <ChromeScrollProvider>
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          paddingHorizontal: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* All existing Tab.Screen entries unchanged */}
      {/* … (keep Home, News, Forums, Search, MySpace exactly as today) */}
    </Tab.Navigator>
    <SideMenu />
  </ChromeScrollProvider>
);
```

Note: keep `tabBarStyle` in `screenOptions` — `BottomTabBar` reads its own descriptor options. The `AnimatedTabBar` wrapper only animates the *container*; styling of the bar itself is unchanged.

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Run: `cd mobile && npm run start` then load on a device or simulator.
Expected:
- App boots normally.
- Tab bar is visible at the bottom with the same five tabs.
- Tapping each tab still navigates.
- Tab badge dot on Forums still shows.
- Tab badge dot on MySpace still shows (when `unreadCount > 0`).
- *No scroll-hide behavior yet* — that comes after the per-screen tasks. Chrome should stay statically visible.

- [ ] **Step 5: Ask user, then commit**

```bash
git add mobile/src/navigation/MainTabNavigator.tsx
git commit -m "feat(mobile): wire MainTabNavigator with chrome scroll provider"
```

---

### Task 6: Rewrite forums `useHideOnScroll` as a worklet (precondition for Task 9)

**Files:**
- Modify: `mobile/src/features/forums/hooks/useHideOnScroll.ts`
- Modify: `mobile/src/features/forums/components/ForumPaginationBar.tsx`
- Modify: `mobile/src/features/forums/components/ForumListView.tsx`
- Modify: `mobile/src/features/forums/screens/ForumThreadScreen.tsx`

Two `useAnimatedScrollHandler` calls cannot both attach to the same scrollable. The new app-chrome handler (`useScrollChrome`) and the existing forums-pagination-bar handler must compose into one. We rewrite `useHideOnScroll` to expose a worklet function rather than a JS callback, then both handlers run in a single composed `useAnimatedScrollHandler` worklet.

- [ ] **Step 1: Rewrite `useHideOnScroll.ts`**

Replace the entire file with:

```ts
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import type { NativeScrollEvent } from 'react-native';

/**
 * Worklet-based hide-on-scroll for an in-page bar (e.g. forums pagination bar).
 *
 * Returns:
 *   - `hidden`: SharedValue<number> (0 = visible, 1 = hidden) — drive an
 *     Animated.View via useAnimatedStyle.
 *   - `applyScroll`: worklet function — call from inside any
 *     useAnimatedScrollHandler to update `hidden` based on scroll delta.
 *   - `show`: JS function — force the bar visible (e.g. on a sort toggle).
 *
 * Mimics Twitter / Reddit / Instagram bar-hide behavior on mobile.
 */
export function useHideOnScroll(threshold = 8) {
  const hidden = useSharedValue(0);
  const lastY = useSharedValue(0);

  // Worklet — invoked from a useAnimatedScrollHandler in the consumer.
  function applyScroll(e: NativeScrollEvent) {
    'worklet';
    const y = e.contentOffset.y;
    const layoutH = e.layoutMeasurement.height;
    const contentH = e.contentSize.height;
    const delta = y - lastY.value;
    lastY.value = y;

    const nearTop = y < 80;
    const nearBottom = y + layoutH >= contentH - 60;

    if (nearTop || nearBottom) {
      if (hidden.value !== 0) hidden.value = withTiming(0, { duration: 180 });
      return;
    }

    if (delta > threshold && hidden.value !== 1) {
      hidden.value = withTiming(1, { duration: 180 });
    } else if (delta < -threshold && hidden.value !== 0) {
      hidden.value = withTiming(0, { duration: 180 });
    }
  }

  function show() {
    hidden.value = withTiming(0, { duration: 180 });
  }

  return { hidden, applyScroll, show } as {
    hidden: SharedValue<number>;
    applyScroll: (e: NativeScrollEvent) => void;
    show: () => void;
  };
}
```

- [ ] **Step 2: Update `ForumPaginationBar.tsx` consumer**

Find every usage of the `hidden` prop. The bar today receives `hidden: boolean`. Change it to receive `hidden: SharedValue<number>` and apply an animated style:

```tsx
// At the top of ForumPaginationBar.tsx:
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';

interface Props {
  // ... other props unchanged
  hidden: SharedValue<number>;
}

export default function ForumPaginationBar({ hidden, /* ...other props */ }: Props) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(hidden.value, [0, 1], [0, 80], Extrapolation.CLAMP),
    }],
    opacity: interpolate(hidden.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[/* existing container style */, animStyle]}>
      {/* existing bar content */}
    </Animated.View>
  );
}
```

(Adapt to the existing styles — the literal `80` is the conservative bar height; if the file uses an `onLayout`-measured height, use that instead.)

- [ ] **Step 3: Update `ForumListView.tsx` consumer**

Find the line: `const { hidden: barHidden, onScroll: handleListScroll } = useHideOnScroll();`

Replace with:

```tsx
import { useAnimatedScrollHandler } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

// ...

const { hidden: barHidden, applyScroll: applyBarScroll } = useHideOnScroll();

const listScrollHandler = useAnimatedScrollHandler({
  onScroll: (e) => {
    'worklet';
    applyBarScroll(e);
  },
});
```

Then in the JSX, replace `<FlatList ... onScroll={handleListScroll}>` with `<Animated.FlatList ... onScroll={listScrollHandler}>` (Animated.FlatList is built into Reanimated).

The `ForumPaginationBar` consumer in this file: pass `hidden={barHidden}` (still the same prop name, but now it's a `SharedValue<number>` instead of a boolean — matches the updated `ForumPaginationBar`).

- [ ] **Step 4: Update `ForumThreadScreen.tsx` consumer**

Same migration. Find: `const { hidden: barHidden, onScroll: handleListScroll } = useHideOnScroll();`. Replace with the `applyScroll` worklet form, wrap in `useAnimatedScrollHandler`, and switch its `FlatList`/`FlashList` to the `Animated.*` equivalent.

- [ ] **Step 5: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS.

- [ ] **Step 6: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 7: Manual smoke test**

Run app. Navigate to Forums tab → scroll inside the forums list.
Expected:
- Pagination bar at the bottom still hides on scroll-down and reappears on scroll-up.
- No visual regressions vs the pre-refactor behavior.
- Same on ForumThreadScreen (open any forum → any thread → scroll).

- [ ] **Step 8: Ask user, then commit**

```bash
git add mobile/src/features/forums/hooks/useHideOnScroll.ts \
        mobile/src/features/forums/components/ForumPaginationBar.tsx \
        mobile/src/features/forums/components/ForumListView.tsx \
        mobile/src/features/forums/screens/ForumThreadScreen.tsx
git commit -m "refactor(mobile): convert useHideOnScroll to worklet handler"
```

---

### Task 7: Plumb HomeScreen (FlashList)

**Files:**
- Modify: `mobile/src/features/home/screens/HomeScreen.tsx`

- [ ] **Step 1: Imports & module-scope animated component**

Add at the top of the file (under existing imports):

```tsx
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import AnimatedTopBar from '../../../components/layout/chromeScroll/AnimatedTopBar';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';

// MUST be at module scope. Defining this inside the component would recreate
// the wrapper on every render and FlashList would lose its list state.
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
```

- [ ] **Step 2: Hook into chrome and reset on focus**

Inside `HomeScreen()`, near the top of the function body:

```tsx
const { scrollHandler, resetChrome } = useScrollChrome();
const [topInset, setTopInset] = useState(0);

useFocusEffect(
  useCallback(() => {
    resetChrome();
  }, [resetChrome]),
);
```

- [ ] **Step 3: Plumb resetChrome into pull-to-refresh**

Modify `handleRefresh`:

```tsx
const handleRefresh = useCallback(async () => {
  resetChrome();
  setRefreshing(true);
  try {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['banners'] }),
      // ... existing invalidations unchanged
    ]);
  } finally {
    setRefreshing(false);
  }
}, [queryClient, resetChrome]);
```

- [ ] **Step 4: Replace TopNavBrand with AnimatedTopBar**

Find the `<TopNavBrand .../>` line. Replace with:

```tsx
<AnimatedTopBar
  onMenuPress={() => useSideMenuStore.getState().open()}
  onNotificationsPress={() => navigation.navigate('Notifications')}
  onProfilePress={() => navigation.navigate('Profile')}
  notifCount={/* whatever it was before */}
  onMeasure={setTopInset}
/>
```

(Keep whatever props the existing TopNavBrand call used — `AnimatedTopBar` forwards them verbatim.)

- [ ] **Step 5: Swap FlashList → AnimatedFlashList, wire onScroll, pad for absolute header**

Find the `<FlashList ... />`. Change to `<AnimatedFlashList ... />` and add:

```tsx
<AnimatedFlashList
  // ... all existing props
  onScroll={scrollHandler}
  scrollEventThrottle={16}
  contentContainerStyle={{ paddingTop: topInset }}
/>
```

If a `contentContainerStyle` already exists, merge `paddingTop: topInset` into it.

Also add `paddingBottom` for the now-absolute tab bar — but actually `BottomTabBar` already inset-pads list content via React Navigation's `useBottomTabBarHeight`. Verify on first manual test; if the bottom of the list is hidden by the tab bar, add `paddingBottom: useBottomTabBarHeight()` to the `contentContainerStyle`.

- [ ] **Step 6: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS. If the `AnimatedFlashList`'s `onScroll` type complains, cast: `onScroll={scrollHandler as any}` and add a `// eslint-disable-next-line @typescript-eslint/no-explicit-any` above. Reanimated's typings + FlashList's typings are a known rough spot — explicit cast is acceptable here.

- [ ] **Step 7: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 8: Manual verification on Home tab**

| Check | Pass criteria |
|---|---|
| Scroll down a screen-height | Header slides up, tab bar slides down, both fade out in ~180ms |
| Scroll up by any amount | Both reappear in ~180ms, no overshoot |
| Bounce at the top | Chrome remains visible |
| Reach the bottom (VIEW ALL section) | Chrome auto-reveals |
| Pull-to-refresh from a hidden-chrome state | Chrome resets to visible before spinner appears |
| Switch to News tab and back | Chrome visible on return |
| Push to Article detail and back | Chrome visible on return |
| Horizontal swipe on FeaturedBannerCarousel / StoriesStrip | Chrome state unaffected |
| Fast flick down then up | No stuck mid-translate flash |

- [ ] **Step 9: Ask user, then commit**

```bash
git add mobile/src/features/home/screens/HomeScreen.tsx
git commit -m "feat(mobile): hide chrome on scroll on Home tab"
```

---

### Task 8: Plumb NewsScreen (ScrollView)

**Files:**
- Modify: `mobile/src/features/news/screens/NewsScreen.tsx`

NewsScreen uses `ScrollView`, not `FlashList`. Reanimated provides `Animated.ScrollView` directly — no module-scope wrapper needed.

- [ ] **Step 1: Imports**

Add:

```tsx
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { useCallback } from 'react';  // if not already imported
import AnimatedTopBar from '../../../components/layout/chromeScroll/AnimatedTopBar';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';
```

- [ ] **Step 2: Hook + focus reset + topInset**

Inside `NewsScreen()`:

```tsx
const { scrollHandler, resetChrome } = useScrollChrome();
const [topInset, setTopInset] = useState(0);

useFocusEffect(
  useCallback(() => {
    resetChrome();
  }, [resetChrome]),
);
```

- [ ] **Step 3: Plumb into pull-to-refresh**

Find the handler (or `RefreshControl` `onRefresh` callback) and prepend `resetChrome();` to its body.

- [ ] **Step 4: Replace TopNavBrand → AnimatedTopBar**

Same as Task 7 Step 4 — pass `onMeasure={setTopInset}`.

- [ ] **Step 5: Swap ScrollView → Animated.ScrollView**

Find the outer `<ScrollView ... />` rendering the feed content. Change to:

```tsx
<Animated.ScrollView
  // ... all existing props
  onScroll={scrollHandler}
  scrollEventThrottle={16}
  contentContainerStyle={[
    // existing contentContainerStyle (if any),
    { paddingTop: topInset },
  ]}
>
```

- [ ] **Step 6: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS.

- [ ] **Step 7: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 8: Manual verification on News tab**

Run the same 9-row manual matrix from Task 7 Step 8, swapping "FeaturedBannerCarousel/StoriesStrip" for "any horizontal sections inside NewsScreen (e.g. NewsVideoSection, NewsVisualStoriesSection)".

- [ ] **Step 9: Ask user, then commit**

```bash
git add mobile/src/features/news/screens/NewsScreen.tsx
git commit -m "feat(mobile): hide chrome on scroll on News tab"
```

---

### Task 9: Plumb ForumsMainScreen + composed handler in ForumListView

**Files:**
- Modify: `mobile/src/features/forums/screens/ForumsMainScreen.tsx`
- Modify: `mobile/src/features/forums/components/ForumListView.tsx`

ForumsMainScreen renders the `TopNavBrand`-style chrome; ForumListView owns the inner FlatList. The two-handler composition (new chrome handler + existing pagination-bar handler — both now worklets after Task 6) lives in `ForumListView`.

- [ ] **Step 1: Modify `ForumsMainScreen.tsx`**

Replace the existing TopNavBrand instance with AnimatedTopBar (same pattern as Task 7 Step 4). Wire `useScrollChrome().resetChrome` in a `useFocusEffect`. Track `topInset` via `onMeasure`. Pass `topInset` down to `ForumListView` as a new prop:

```tsx
<ForumListView onForumPress={handleForumPress} topInset={topInset} />
```

- [ ] **Step 2: Modify `ForumListView.tsx` — accept `topInset` prop and compose handlers**

Update the `Props` interface:

```tsx
interface Props {
  onForumPress: (forum: Forum) => void;
  topInset?: number;
}

export default function ForumListView({ onForumPress, topInset = 0 }: Props) {
  // ...
}
```

Compose both scroll writers (chrome + pagination bar) inside a single `useAnimatedScrollHandler`. Both expose worklet functions (`applyScroll`) that operate on their own SharedValues, so they can be invoked side-by-side inside one handler. (Note: you cannot nest the result of `useAnimatedScrollHandler` inside another `useAnimatedScrollHandler` — that's why Task 2 also exposes the raw `applyScroll` worklet, used here.)

- [ ] **Step 3: Use the composed handler in `ForumListView`**

```tsx
const { hidden: barHidden, applyScroll: applyBarScroll } = useHideOnScroll();
const { applyScroll: applyChromeScroll, resetChrome } = useScrollChrome();

const composedHandler = useAnimatedScrollHandler({
  onScroll: (e) => {
    'worklet';
    applyChromeScroll(e);
    applyBarScroll(e);
  },
});
```

Wire `<Animated.FlatList ... onScroll={composedHandler} contentContainerStyle={{ paddingTop: topInset }} />`.

- [ ] **Step 4: Reset chrome on pull-to-refresh**

In the refresh callback inside `ForumListView`, call `resetChrome()` before triggering refetch.

- [ ] **Step 5: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS.

- [ ] **Step 6: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 7: Manual verification on Forums tab**

Run the 9-row matrix from Task 7 Step 8, plus:

| Extra check | Pass criteria |
|---|---|
| Forums pagination bar still hides on scroll-down | Yes — its in-page bar continues to behave |
| Forums pagination bar reappears on scroll-up | Yes |
| App chrome (top header + bottom tab bar) hides on the same scroll | Yes — both effects coexist |
| Search input bar within ForumListView remains in flow | Not affected by chrome animation |

- [ ] **Step 8: Ask user, then commit**

```bash
git add mobile/src/components/layout/chromeScroll/useScrollChrome.ts \
        mobile/src/features/forums/screens/ForumsMainScreen.tsx \
        mobile/src/features/forums/components/ForumListView.tsx
git commit -m "feat(mobile): hide chrome on scroll on Forums tab with composed handler"
```

---

### Task 10: Plumb MySpaceMainScreen (ScrollView)

**Files:**
- Modify: `mobile/src/features/myspace/screens/MySpaceMainScreen.tsx`

Same pattern as NewsScreen — MySpaceMainScreen uses a `ScrollView`.

- [ ] **Step 1: Imports**

Add the same set as Task 8 Step 1.

- [ ] **Step 2: Hook + focus reset + topInset**

Inside `MySpaceMainScreen()`:

```tsx
const { scrollHandler, resetChrome } = useScrollChrome();
const [topInset, setTopInset] = useState(0);

useFocusEffect(
  useCallback(() => {
    resetChrome();
  }, [resetChrome]),
);
```

- [ ] **Step 3: Plumb into pull-to-refresh**

Find the `RefreshControl onRefresh` callback. Prepend `resetChrome();`.

- [ ] **Step 4: Replace TopNavBrand → AnimatedTopBar** (with `onMeasure={setTopInset}`).

- [ ] **Step 5: Swap ScrollView → Animated.ScrollView**

```tsx
<Animated.ScrollView
  // ...existing props
  onScroll={scrollHandler}
  scrollEventThrottle={16}
  contentContainerStyle={[
    // existing contentContainerStyle (if any),
    { paddingTop: topInset },
  ]}
>
```

- [ ] **Step 6: Type-check**

Run: `cd mobile && npm run tsc`
Expected: PASS.

- [ ] **Step 7: Lint**

Run: `cd mobile && npm run lint`
Expected: PASS.

- [ ] **Step 8: Manual verification on MySpace tab**

Run the 9-row matrix from Task 7 Step 8. ProfileHero, stats row, tab bar, and the active profile tab content (ActivityTab/PostsTab/etc.) should all scroll normally with chrome hide/reveal applied.

- [ ] **Step 9: Ask user, then commit**

```bash
git add mobile/src/features/myspace/screens/MySpaceMainScreen.tsx
git commit -m "feat(mobile): hide chrome on scroll on MySpace tab"
```

---

### Task 11: Final regression sweep & performance check

**Files:** (verification only, no code changes expected)

- [ ] **Step 1: Run all gates one final time**

```bash
cd mobile && npm run tsc && npm run lint
```

Expected: PASS for both.

- [ ] **Step 2: Cross-tab regression matrix**

| Tab | Chrome hides on scroll-down | Chrome reveals on scroll-up | Tab switch resets to visible | Pull-to-refresh resets to visible |
|---|---|---|---|---|
| Home | ✓ | ✓ | ✓ | ✓ |
| News | ✓ | ✓ | ✓ | ✓ |
| Forums | ✓ (and pagination bar still hides locally) | ✓ | ✓ | ✓ |
| Search | unchanged — chrome stays visible | n/a | n/a | n/a |
| MySpace | ✓ | ✓ | ✓ | ✓ |

- [ ] **Step 3: Detail-screen non-regression**

Open at least one detail screen reachable from each plumbed tab and confirm it still renders its own static back-button header:
- ArticleDetail (from Home or News)
- ForumThread → TopicDetail (from Forums)
- ProfileScreen child screens (from MySpace)

Expected: detail screens are unchanged. No chrome animation interferes.

- [ ] **Step 4: SideMenu non-regression**

From any plumbed tab, tap the hamburger inside the (now-animated) header. SideMenu should slide in normally.

- [ ] **Step 5: Tab badges non-regression**

Trigger an unread notification (or use existing seeded data). Confirm:
- Forums tab's static notif dot still renders.
- MySpace tab's `unreadCount > 0` dot still renders.
- Both dots remain visible during chrome translate.

- [ ] **Step 6: Push-notification routing non-regression**

If feasible in the dev environment, send a test push that opens a deep-linked screen. Confirm the destination screen opens with chrome visible (covered by `useFocusEffect` reset, not `tabPress`).

- [ ] **Step 7: Performance — fast flick test**

Open React Native dev menu → Show Perf Monitor on a device (not simulator).
On the Home tab, perform 3 hard flicks downward followed by 3 hard flicks upward.
Expected:
- JS-thread FPS stays ≥ 58.
- UI-thread FPS pinned at 60.

Repeat on Android if iOS was the primary dev target (or vice versa).

- [ ] **Step 8: Ask user, then commit (if any fixup was needed)**

If Steps 1–7 surfaced any issues that required fixes, stage and commit those fixes with a descriptive message. Otherwise no commit needed for this task — it's verification only.

- [ ] **Step 9: Hand off**

The feature is complete. Report to the user:
- All four feed tabs have hide-on-scroll chrome.
- Forums local pagination bar still works (worklet refactor preserves behavior).
- Performance gates met.
- No detail-screen regressions.

---

## Implementation Notes (recap of spec §10)

1. `Animated.createAnimatedComponent(FlashList)` is defined at module scope in Task 7. Defining it inside the component would recreate the wrapper on every render and FlashList would lose state.
2. `translateY` distance is measured via `onLayout` (Tasks 3, 4) — not hardcoded — so the chrome fully disappears on devices with a notch or tall status bar.
3. Chrome reset uses `useFocusEffect` per screen, not a navigator-level `tabPress` listener (Tasks 7–10). Programmatic navigation (deep links, push-notification taps) is covered because `useFocusEffect` fires for all entry paths.
4. `AnimatedTabBar` paints an opaque background (`colors.card`) in Task 4 to prevent ghosting mid-translate.
5. Worklets compose in `ForumListView` (Task 9) by calling each writer's `applyScroll(e)` worklet function inside a single `useAnimatedScrollHandler` — no `runOnJS` shim.
