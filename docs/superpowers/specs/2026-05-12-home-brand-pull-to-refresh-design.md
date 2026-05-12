# Home tab — Brand pull-to-refresh

## Why

Home (the "Explore" tab) uses the OS `RefreshControl`. Two problems:

1. The spinner renders behind the absolute-positioned `AnimatedTopBar` because the FlashList scrolls from y=0 while only `contentContainerStyle.paddingTop` shifts the content. A `progressViewOffset={topInset}` patch fixes visibility but leaves the indicator looking like every other RN app.
2. The generic OS spinner feels off against the rest of the home design language (accent-bar headers, image-led cards, brand gem in the top bar). Modern Indian-app peers (Hotstar, Inshorts) brand the loader itself.

Goal: replace the OS spinner with a brand-gem indicator that emerges as you pull, snaps to a held position on release, spins through the fetch, and animates out cleanly.

## Scope

In scope:

- New `BrandPullToRefresh` wrapper component.
- Apply on `HomeScreen` only. Other screens keep their existing `RefreshControl` and are migrated later if and when desired.
- Tiny return-value addition to `useScrollChrome` so the wrapper can read scroll position without re-attaching a second scroll handler.

Out of scope:

- Haptics (not requested).
- Inline "Updated just now" feedback (not requested).
- Migrating MySpace / Forums / Notifications / Messages / Movies / Quizzes / Profile / Search refresh.
- Reworking the `AnimatedTopBar` / chrome hide-on-scroll behavior.

## Component

**File:** `mobile/src/components/ui/BrandPullToRefresh.tsx`

**Public props:**

```ts
type Props = {
  refreshing: boolean;        // mirrors RefreshControl.refreshing
  onRefresh: () => void;      // mirrors RefreshControl.onRefresh
  topInset: number;           // measured height of AnimatedTopBar
  scrollY: SharedValue<number>; // current vertical scroll offset from useScrollChrome
  children: ReactNode;        // the scrollable list (FlashList / ScrollView)
};
```

**Indicator visual:**

- Renders the brand gem (`mobile/assets/icon.png`, same asset as `TopNavBrand`) inside a 40×40 rounded card with a soft shadow.
- Anchored to the top of the scroll surface, offset down by `topInset` so it sits just below the chrome.
- Driven by a single `pullDistance` shared value clamped to `[0, MAX_PULL]` (140px).

**Constants:**

- `PULL_THRESHOLD = 80` — distance past which release triggers refresh.
- `MAX_PULL = 140` — clamp to prevent unbounded drag.
- `HELD_OFFSET = 56` — y-offset the indicator (and list) hold at while refreshing.
- `RESISTANCE = 0.5` — finger-to-pull translation ratio.

**States:**

| State        | Trigger                                | Visual                                                                 |
|--------------|----------------------------------------|------------------------------------------------------------------------|
| Idle         | `pullDistance === 0 && !refreshing`    | Indicator opacity 0, list translateY 0.                                |
| Pulling      | Pan active, list at top, dragging down | Opacity = `progress`, scale `0.5 + progress * 0.5`, rotate `progress * 360deg`. List translateY follows finger × `RESISTANCE`. |
| Ready        | `pullDistance >= PULL_THRESHOLD`       | Indicator full size; subtle color/opacity bump (optional polish).      |
| Refreshing   | Released past threshold; `refreshing` true | List + indicator spring to `HELD_OFFSET`. Gem rotates continuously (1.2s/turn, infinite). |
| Completing   | `refreshing` flips false               | Spring back to 0 over ~250ms while indicator fades.                    |

## Gesture composition

- `Gesture.Pan()` from `react-native-gesture-handler` v2.
- Pan only consumes the delta when `scrollY.value <= 0 && translationY > 0`. Otherwise the native scroll wins (no double drag).
- Composed with the native scroll via `Gesture.Native()` ref + `Gesture.Simultaneous(pan, native)` so vertical scrolling inside the FlashList continues to work normally.
- `onUpdate` writes to `pullDistance` (clamped, with resistance).
- `onEnd` decides:
  - If `pullDistance >= PULL_THRESHOLD`: spring to `HELD_OFFSET`, `runOnJS(onRefresh)()`.
  - Else: spring `pullDistance` back to 0.
- `useEffect` on `refreshing`:
  - When it transitions from true → false: spring `pullDistance` back to 0.
  - When it transitions from false → true (e.g. external trigger): spring to `HELD_OFFSET`.

## `useScrollChrome` change

Currently returns `{ scrollHandler, applyScroll, resetChrome }`. We expose the existing `lastY` shared value:

```ts
return { scrollHandler, applyScroll, resetChrome, scrollY: lastY };
```

No behavioral change. Existing callers (NewsScreen, MySpaceMainScreen, Forums views) ignore the new field. HomeScreen passes it to `BrandPullToRefresh`.

## HomeScreen integration

Replace the `refreshControl={<RefreshControl … />}` prop on `AnimatedFlashList` with a wrapper:

```tsx
<BrandPullToRefresh
  refreshing={refreshing}
  onRefresh={handleRefresh}
  topInset={topInset}
  scrollY={scrollY}
>
  <AnimatedFlashList … /* no refreshControl */ />
</BrandPullToRefresh>
```

`handleRefresh` and its `useCallback` body stay unchanged.

## Cross-platform notes

- iOS: no native bounce is needed — the wrapper drives translation. We can leave `bounces` at default; if the native bounce visually competes with our pull, set `bounces={false}` on the FlashList.
- Android: no OS overscroll glow to worry about, but `overScrollMode="never"` on the FlashList keeps the native glow from showing under the indicator.

## Verification

- Manual: pull down on Home, confirm gem emerges, scales, rotates, holds while fetch runs, fades out. Pull less than threshold and release: should spring back without fetching. Trigger refresh while list is mid-scroll (scrollY > 0): pan should not consume — list scrolls normally.
- `npm run tsc` clean.
- No new lint errors.

## Risks and rollback

- Gesture composition on FlashList can be finicky; if pan starves the scroll on Android, fall back to a `GestureDetector` wrapping a `ScrollView`-only path or restrict the pan to `activeOffsetY` with a small downward bias.
- If the visual polish is unsatisfying, the wrapper is local to `HomeScreen` and can be reverted by restoring the `refreshControl` prop with the existing `progressViewOffset` patch.
