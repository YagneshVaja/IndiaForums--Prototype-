# Mobile Shorts Screen — Design

**Date:** 2026-04-23
**Status:** Approved for implementation
**Scope:** Replace the `PlaceholderScreen` wired to `HomeStack.Shorts` with a production React Native Shorts reel screen that mirrors the web prototype at `indiaforums/src/screens/ShortsScreen.jsx`.

---

## 1. Goal

Ship a full-bleed, TikTok-style vertical reel player for short-form content on the IndiaForums mobile app. Visual and interaction parity with the web prototype is the target — same categories, same card layout, same 6-second auto-advance, same tap-to-pause, same swipe-up hint, same external-link CTA. Playback is thumbnail + CTA only (no inline video); tapping "Watch on YouTube" opens the external URL via `Linking.openURL`.

Data is sourced live from `GET /api/v1/shorts`. No mock-only mode.

---

## 2. Non-goals

- Inline video playback (no `expo-av`, no YouTube WebView). External link only.
- In-app sharing, likes, comments, or any social actions on a short.
- Shorts-as-a-top-level-tab. Access stays through the existing Home-stack screen reached from `StoriesStrip` (⚡ icon) and `SideMenu`.
- New design tokens. All colors/spacing must come from the existing `theme/tokens`.
- Offline caching of shorts beyond React Query's default in-memory cache.

---

## 3. Module layout

Mirror the `features/videos/` feature folder convention:

```
mobile/src/features/shorts/
├── screens/
│   └── ShortsScreen.tsx
├── components/
│   ├── ShortCard.tsx
│   ├── ShortsCategoryBar.tsx
│   ├── ShortSkeleton.tsx
│   └── SwipeHint.tsx
├── hooks/
│   └── useShorts.ts
└── data/
    └── categories.ts
```

Changes outside the feature folder:

- `mobile/src/services/api.ts` — add `Short`, `ShortsPage` types and `fetchShorts(page, pageSize, categoryId)`.
- `mobile/src/navigation/HomeStack.tsx:42` — replace `<Stack.Screen name="Shorts" component={PlaceholderScreen} />` with `component={ShortsScreen}`.

No changes to navigation types, root navigator, bottom tabs, or existing entry points (already wired).

---

## 4. Data layer

### 4.1 API shape

Live endpoint (confirmed by web client `indiaforums/src/hooks/useShorts.js`):

```
GET /api/v1/shorts?pageNumber=1&pageSize=20[&parentCategoryId=2]
→ { data: RawShort[], totalCount: number }

RawShort = {
  shortId: number,
  title: string,
  description: string,
  pageUrl: string,                 // slug, used to build thumbnail + fallback URL
  shortUpdateChecksum: string,     // cache-buster appended to thumbnail URL
  statusCode: number,
  publishedWhen: string,           // ISO
  credits: string,                 // source tag e.g. "BOLLYCURRY"
  linkUrl: string,                 // destination URL (YouTube or IndiaForums)
}
```

### 4.2 Types (add to `services/api.ts`)

```ts
export interface Short {
  id: number;
  title: string;
  description: string;
  pageUrl: string;        // resolved destination URL
  thumbnail: string | null;
  publishedAt: string;    // formatted en-IN
  credits: string;
  isYouTube: boolean;     // precomputed for CTA label
}

export interface ShortsPage {
  shorts: Short[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    hasNextPage: boolean;
  };
}
```

### 4.3 Transform rules

Port from `indiaforums/src/hooks/useShorts.js`:

- `thumbnail` = `https://img.indiaforums.com/shorts/720x0/0/{shortId}-{pageUrl}.webp?c={shortUpdateChecksum}` when both parts present; else `null`.
- `pageUrl` = `raw.linkUrl` when present; else `https://www.indiaforums.com/shorts/{shortId}/{raw.pageUrl}`.
- `publishedAt` = `new Date(raw.publishedWhen).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })`; empty string on parse failure.
- `isYouTube` = `/youtube\.com|youtu\.be/.test(pageUrl)`.

### 4.4 `fetchShorts`

Follows the `fetchVideos` template in `services/api.ts:1539`: build query params, call `apiClient.get`, return a normalized `ShortsPage`. Compute `hasNextPage = page * pageSize < totalCount`. On failure, log and rethrow (no mock fallback — this feature requires live data per scope).

### 4.5 `useShorts` hook

React Query `useInfiniteQuery`, modeled on `features/videos/hooks/useVideos.ts`:

```ts
queryKey: ['shorts', categoryId ?? 'all']
queryFn: ({ pageParam = 1 }) => fetchShorts(pageParam, 20, categoryId)
getNextPageParam: (last) =>
  last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined
staleTime: 2 * 60 * 1000
placeholderData: keepPreviousData
```

### 4.6 Categories

`features/shorts/data/categories.ts` mirrors the web:

```ts
export const SHORTS_CATEGORIES = [
  { id: 'all',    label: 'All',    apiId: null },
  { id: 'tv',     label: 'TV',     apiId: 2    },
  { id: 'movies', label: 'Movies', apiId: 3    },
  { id: 'ott',    label: 'OTT',    apiId: 4    },
  { id: 'sports', label: 'Sports', apiId: 5    },
] as const;
```

---

## 5. Screen composition

### 5.1 `ShortsScreen`

- Full-bleed black `View` (`backgroundColor: '#000'`) filling the Home-stack screen area above the bottom tab bar.
- **Minimal frosted-dark header** floating over the media (matches the reference screenshot):
  - Absolute positioned at `top: insets.top`, z-index 25, height 44.
  - Left: 36×36 circular back pressable (`Ionicons chevron-back`, size 22, white) → `navigation.goBack()`.
  - Center: "Shorts" label, 16px 700-weight white.
  - Background: `rgba(0,0,0,0.32)` over an `expo-blur` `BlurView intensity={20} tint="dark"`.
- **`ShortsCategoryBar`** pinned directly below the header at `top: insets.top + 44`, z-index 20. Height ~44 including padding.
- `FlatList` of `ShortCard` fills the rest. Each item's height = `windowHeight - tabBarHeight - insets.bottom` (full remaining viewport — header and category bar overlay the top of the card, not pushing the card down).
- Status bar: `<StatusBar style="light" />` from `expo-status-bar`, scoped via `useFocusEffect`. Restore previous style on blur.
- On category change: scroll back to index 0, reset `activeIndex`, reset `hasScrolled` flag.

### 5.2 `FlatList` config

```ts
pagingEnabled
snapToInterval={cardHeight}
decelerationRate="fast"
showsVerticalScrollIndicator={false}
getItemLayout={(_, i) => ({ length: cardHeight, offset: cardHeight * i, index: i })}
onViewableItemsChanged={onViewableItemsChanged}
viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
onEndReached={onEndReached}
onEndReachedThreshold={0.5}
```

`onViewableItemsChanged` must be a `useRef`'d stable callback (React Navigation rule) that sets `activeIndex` to the first viewable item's index. `viewabilityConfig` must also live in a ref.

### 5.3 Active-card contract

Only the card at `activeIndex` runs its auto-advance timer and responds to taps. All other cards stay static (progress at 0, no interval). This is passed down as an `isActive` prop.

### 5.4 Advance action

`handleAdvance(index)` → `flatListRef.current?.scrollToIndex({ index: index + 1, animated: true })`. Guard against out-of-range when it's the last card and `hasNextPage` is false.

---

## 6. `ShortCard` layout

Card fills the list item bounds exactly. Stacked layers, bottom to top:

1. **Blurred background** (`<Image source={{ uri: short.thumbnail }} blurRadius={24} style={{ position:'absolute', inset: -14, ..., opacity: 0.32 }}>`). Absent when `thumbnail` is null — replaced with a gradient `View` using a deterministic fallback color set.
2. **Foreground thumbnail** (`<Image resizeMode="contain" style={{ position:'absolute', inset: 0 }}>`). `expo-image` is preferred if already a dependency — it has better caching. Otherwise native `<Image>`.
3. **Gradient scrim** (`expo-linear-gradient`): `colors={['transparent','transparent','rgba(0,0,0,0.18)','rgba(0,0,0,0.60)','rgba(0,0,0,0.92)']}`, `locations={[0, 0.28, 0.45, 0.65, 1]}`, pointer-events none.
4. **Progress bar**: 2.5px line at `top: insets.top + 88 + 4` (below header + category bar), left/right 14. White 22% background track, white 92% `Animated.View` fill for width 0→100%.
5. **Source credit pill**: absolute at `top: insets.top + 88 + 4 + 10`, left 14. `BlurView intensity={20} tint="dark"` with 14% white fill, 18% white border, uppercase 9px 700-weight text, letter-spacing 0.7.
6. **Flash overlay**: centered Pause/Play icon on a 36px dark circle. Mounted only when `flashIcon` state is set; fades via `Animated.sequence` over 700ms.
7. **Bottom overlay** `View` pinned bottom with `padding: { horizontal: 16, bottom: 22 }`:
   - Title: `color: '#fff'`, `fontSize: 16`, `fontWeight: '800'`, `lineHeight: 21`, `numberOfLines={3}`, `textShadow` 0 1 8 rgba(0,0,0,0.6).
   - Description: `color: 'rgba(255,255,255,0.68)'`, `fontSize: 12`, `lineHeight: 18`, `numberOfLines={2}`. Render only when non-empty.
   - Meta row: date left (10.5px, 40% white) + counter right (`{index + 1} / {total}`, 10px 600-weight, 38% white, letter-spacing 0.5). Flex-space-between.
   - CTA button: `Pressable` with `brand` background, `borderRadius: 10`, `paddingVertical: 11`, `paddingHorizontal: 18`, centered label. Label = `'▶  Watch on YouTube'` if `short.isYouTube` else `'Read Full Story  →'`. Press state: opacity 0.85, scale 0.98. On press: `Linking.openURL(short.pageUrl)`.
8. **Swipe-up hint**: only when `index === 0 && !hasScrolled && total > 1`. Centered column bottom-130: two stacked chevron-up icons (45% + 75% opacity) + "Swipe up for next" label (55% white, 10px). Pulse animation via `Animated.loop` (translateY 0→-6, opacity 1→0.6, 1800ms ease-in-out).

### 6.1 Tap-to-pause

`Pressable` wraps the card (excluding the CTA and back-button zones). On press:
- Toggle `isPausedRef.current`.
- Set `flashIcon` to `'pause'` or `'play'` for 700ms.
- Progress timer reads `isPausedRef.current` each tick and skips the increment when paused.

---

## 7. Auto-advance timer

Effect lives inside `ShortCard`, keyed on `isActive`:

```ts
useEffect(() => {
  if (!isActive) { progress.setValue(0); return; }
  progress.setValue(0);
  let elapsed = 0;
  const DURATION = 6000;
  const TICK = 100;
  const interval = setInterval(() => {
    if (isPausedRef.current) return;
    elapsed += TICK;
    const pct = Math.min(elapsed / DURATION, 1);
    progress.setValue(pct);
    if (pct >= 1) {
      clearInterval(interval);
      onAdvance();
    }
  }, TICK);
  return () => clearInterval(interval);
}, [isActive, onAdvance]);
```

`progress` is an `Animated.Value(0)` interpolated to `width: '0%' → '100%'` for the progress bar.

---

## 8. `ShortsCategoryBar`

- Absolute positioned, z-index 20, covering the top slot above the feed.
- Background: `BlurView intensity={30} tint="dark"` with an additional `rgba(0,0,0,0.52)` overlay `View` to match web's frosted-glass feel.
- Bottom hairline: 1px `rgba(255,255,255,0.08)`.
- Horizontal `ScrollView` of pill `Pressable`s. Each pill:
  - Inactive: 1.5px `rgba(255,255,255,0.22)` border, transparent fill, 60% white text, 12px 500-weight.
  - Active: brand fill, brand border, white text, 700-weight.
  - `paddingHorizontal: 15`, `paddingVertical: 5`, `borderRadius: 9999` (pill).
- On press: call `onChange(cat.id)`. Don't await anything; React Query handles the fetch.

---

## 9. States

| State | Rendering |
|---|---|
| Initial loading (`isLoading && shorts.length === 0`) | 3 `ShortSkeleton` cards stacked, each card-height, shimmer animation |
| Error, no data (`isError && shorts.length === 0`) | Centered `ErrorState` with `onRetry={refetch}` |
| Empty (`!isLoading && shorts.length === 0 && !isError`) | Centered `EmptyState` with `icon="⚡"`, `title="No shorts available"`, `subtitle="Check back soon"` |
| Loading more (`isFetchingNextPage`) | 22px brand-tinted spinner as `ListFooterComponent` |
| Error mid-feed | Swallow silently (React Query retries); footer spinner disappears. No toast in v1. |

`ShortSkeleton` visual: matches web's `.skeleton` — dark background, shimmer via `Animated.loop` on a gradient translateX, placeholder bars for progress/chip/title/desc/button at the same positions the real card will render.

---

## 10. Theming and tokens

- Screen background, card background, scrim, progress bar track/fill, swipe-hint text: all **constants** (cinematic dark UI, not theme-adaptive — matches web's decision that the media player is always dark regardless of theme).
- **Brand blue** for the CTA button and active pill: `colors.primary` from `useThemeStore`.
- Status bar style: `'light'` (constant, not theme-adaptive).
- Back-button pill and category bar: frosted dark regardless of theme.

Error/empty states outside the feed still use theme-adaptive `var(--bg)` equivalent via `useThemeStore`.

---

## 11. Navigation and entry points

Already wired (no changes needed):

- `features/home/components/StoriesStrip.tsx:15` — "Shorts" item. Currently falls through to `onItemPress?.()`. `StoriesStrip` in mobile doesn't currently route to Shorts — **add a case** `if (s.label === 'Shorts') { navigation.navigate('Shorts'); return; }` alongside the existing cases.
- `components/layout/SideMenu.tsx:346` — already calls `goHomeScreen('Shorts')`. No change.
- `navigation/HomeStack.tsx:42` — swap `PlaceholderScreen` for `ShortsScreen`.

The navigation param type `Shorts: undefined` at `navigation/types.ts:55` is already correct.

---

## 12. Dependencies

The following packages are assumed already present (used by sibling features):

- `@tanstack/react-query` — videos feature uses it
- `expo-linear-gradient` — common in React Native
- `expo-blur` — for frosted glass (verify in `package.json`; if missing, add it)
- `@expo/vector-icons` — confirmed via MainTabNavigator

Verify during the first plan step. If `expo-blur` is missing, substitute with a solid `rgba(0,0,0,0.6)` backdrop and skip the blur. No other new dependencies.

---

## 13. Testing

No unit test infrastructure is configured in the mobile project (consistent with the web prototype per its `CLAUDE.md`). Verification is manual:

- Navigate from Home → ⚡ Shorts icon → screen loads with skeletons → first page renders.
- Verify all 5 category tabs fetch distinct data; active tab visually distinct.
- Verify 6s auto-advance scrolls to next card; tap pauses/resumes; flash icon appears on tap.
- Verify "Watch on YouTube" label for YouTube links; "Read Full Story" otherwise; tapping opens the external URL.
- Scroll to end of page 1 → verify page 2 fetched (spinner visible, new cards append).
- Force airplane mode → refresh → verify `ErrorState` with retry.
- Verify swipe-up hint only shows on card 0 and disappears after the user moves to card 1.
- Verify status bar is light-content on this screen and reverts elsewhere.
- Verify the screen respects the bottom tab bar (cards don't go under it).

---

## 14. Risks

1. **`expo-blur` perf** on lower-end Android — if the category bar blur causes frame drops, fall back to solid `rgba(0,0,0,0.6)` without `BlurView`.
2. **`onViewableItemsChanged` identity** — recreating the callback each render breaks `FlatList`. Must be stored in a `useRef` per the React Navigation docs.
3. **Timer leaks** — if a card unmounts mid-tick, the cleanup must clear the interval. Effect cleanup covers this.
4. **`scrollToIndex` out of range** — guard with `if (nextIndex < shorts.length) scrollToIndex(...)`. On the last card when no next page exists, let the progress bar complete but skip the scroll.
5. **Image 404s** — thumbnail URLs are constructed; some may 404. `<Image onError>` falls back to the gradient background via local `hasImageError` state.

---

## 15. Out of scope (future work)

- Inline playback via `expo-av` or YouTube IFrame
- Like / share / comment / save actions
- Deep-link into a specific short (`Shorts/{shortId}`)
- Offline prefetch of the next card's image
- Analytics events for impressions/advances/external-link taps
