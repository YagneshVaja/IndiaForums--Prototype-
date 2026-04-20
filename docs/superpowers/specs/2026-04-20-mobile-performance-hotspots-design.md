# Mobile Performance Hotspots — Design

**Date:** 2026-04-20
**Scope:** `mobile/` (React Native / Expo app)
**Approach:** Targeted hotspot fixes (Approach 1 from brainstorm) — ~5 highest-leverage issues, no new infrastructure, no measurement harness.

## Goal

Make the app feel noticeably snappier during scrolling, tab/chip switches, and navigation. Deliver in a single focused change without sprawling into every feature.

## Non-goals

- Startup / time-to-interactive optimization
- Web target code-splitting or bundle analysis
- Any `react-native-reanimated` worklet rework
- Metro / Expo config changes
- Adding perf instrumentation (profiler, `why-did-you-render`, startup timers)
- Behavior changes, visual redesigns, new features

---

## Findings (evidence)

1. **Zero `React.memo` usage.** Grep for `React\.memo|memo\(` across `mobile/src/**/*.tsx` returns no matches. Every list row re-renders on any parent state change.
2. **`expo-image` installed but unused.** `package.json` declares `expo-image ~55.0.8`. No file imports from `expo-image`. ~20 files use native RN `Image` (no disk cache, no memory budget, no placeholder).
3. **Unstable callback props.** `HomeScreen` handlers are plain fns (`mobile/src/features/home/screens/HomeScreen.tsx:35-49`). `VideosScreen` uses an inline `renderItem` closure. `CategoryChips` creates `() => onSelect(category)` inside `.map`.
4. **Non-virtualized article feed on HomeScreen.** `articles.map(...)` inside a `ScrollView` (`mobile/src/features/home/screens/HomeScreen.tsx:90-93`) mounts every card at once.
5. **Category-keyed queries flash `LoadingState` on every chip tap.** `useHomeArticles`, `useNewsArticles`, `useVideos`, `useForumTopics` etc. key on a category param with no `placeholderData`, so switching chips discards previous data.

---

## Fixes

### Fix 1 — Memoize list-row components

Wrap the following components with `React.memo` using a default shallow compare. Export the memoized component as the default.

- `mobile/src/features/home/components/ArticleCard.tsx`
- `mobile/src/features/home/components/FeaturedBannerCarousel.tsx` — memoize the inner `BannerCard`
- `mobile/src/features/forums/components/PostCard.tsx`
- `mobile/src/features/forums/components/TopicCard.tsx`
- `mobile/src/features/forums/components/ThreadCard.tsx`
- `mobile/src/features/forums/components/ForumCard.tsx`
- `mobile/src/features/videos/components/VideoGridCard.tsx`
- `mobile/src/features/videos/components/TrendingVideoCard.tsx`
- `mobile/src/features/videos/components/RelatedVideoCard.tsx`
- `mobile/src/features/galleries/components/GalleryCard.tsx`
- `mobile/src/features/galleries/components/PhotoCell.tsx`
- `mobile/src/features/galleries/components/RelatedGalleryCard.tsx`

Shallow compare is sufficient because props are plain primitives / small object refs, and Fix 2 ensures callbacks are stable.

### Fix 2 — Stabilize parent callbacks

Wrap handler functions passed to memoized children in `useCallback`, and lift inline `renderItem` closures to stable references. Specifically:

- `mobile/src/features/home/screens/HomeScreen.tsx` — `useCallback` on `handleBannerPress`, `handleArticlePress`, and the gallery `onGalleryPress` closure.
- `mobile/src/features/videos/screens/VideosScreen.tsx` — `useCallback` on `handlePress`; lift inline `renderItem` into a `useCallback` that renders `<VideoGridCard />`.
- `mobile/src/features/forums/screens/TopicDetailScreen.tsx` — `useCallback` every handler passed to `PostCard` (`onQuickReact`, `onLongPressReact`, `onReply`, `onQuote`, `onEdit`, `onShare`, `onTrash`, `onPressReactionSummary`, `onPressEdited`, `onPressAvatar`, `onChangeEditText`, `onSaveEdit`, `onCancelEdit`). This is the densest hotspot — without it, Fix 1's memo on `PostCard` is neutralized.
- `mobile/src/features/home/components/CategoryChips.tsx` — change the signature so children don't close over `category`; have the chip call `onSelect(category)` in a stable handler, or bind via a stable `onPress` helper that receives the category. Alternatively pass a small memoized `Chip` subcomponent.

Apply the same pattern anywhere else a memoized child's callback prop is currently an inline fn (spot-check during implementation).

### Fix 3 — Swap `Image` → `expo-image` in image-heavy rows

In the files that import `Image` from `react-native`, replace with:

```tsx
import { Image } from 'expo-image';
```

and apply these props to each usage:

- `cachePolicy="memory-disk"`
- `contentFit="cover"` (replaces `resizeMode="cover"`)
- `transition={150}`
- Keep existing solid-color fallback styling (no blurhash work required)

Files to touch:

- `ArticleCard.tsx`, `FeaturedBannerCarousel.tsx`
- `PostCard.tsx`, `TopicCard.tsx`, `ThreadCard.tsx`, `ForumCard.tsx`
- `VideoGridCard.tsx`, `TrendingVideoCard.tsx`, `RelatedVideoCard.tsx`
- `GalleryCard.tsx`, `GalleryHeroCard.tsx`, `PhotoCell.tsx`, `RelatedGalleryCard.tsx`, `Lightbox.tsx`
- `RankRow.tsx`, `ImageLightbox.tsx`, `BioSection.tsx`
- `MySpaceMainScreen.tsx`, `ArticleDetailScreen.tsx`, `VideoDetailScreen.tsx`, `GalleryDetailScreen.tsx` (detail screens; lower leverage but consistent)

Do **not** replace `Image` usages inside the `TopNavBar` or icon components — those are one-off and not on hot paths.

### Fix 4 — Virtualize the HomeScreen feed

Restructure `mobile/src/features/home/screens/HomeScreen.tsx` so the primary scroll container is a single `FlashList<Article>`:

- `data` = articles from `useHomeArticles`
- `ListHeaderComponent` = stories strip, featured banner carousel, category chips, "Latest News" section header
- `ListFooterComponent` = photo galleries section, web stories strip, forums section, bottom spacer
- `renderItem` = `<ArticleCard />` (now memoized)
- `keyExtractor` = `(a) => a.id`
- `estimatedItemSize` = ~100 (measured from card height)

The sticky-chip behavior from the current `ScrollView`'s `stickyHeaderIndices={[2]}` is deferred — accept a minor UX change (chips scroll with header). If that turns out to feel wrong, we can revisit after implementation.

### Fix 5 — `placeholderData` for category-keyed queries

Add `placeholderData: keepPreviousData` (from `@tanstack/react-query`) to queries whose key includes a UI filter param:

- `mobile/src/features/home/hooks/useHomeData.ts` → `useHomeArticles(category)`
- `mobile/src/features/news/hooks/useNewsData.ts` → `useNewsArticles(category)`
- `mobile/src/features/videos/hooks/useVideos.ts` → `useVideos(contentId)`
- `mobile/src/features/forums/hooks/useForumTopics.ts` / `useAllForumTopics.ts` — if keyed on a filter

Effect: chip taps show the previous results while the new page loads, eliminating the `LoadingState` flash.

---

## Scope summary

- **Files modified:** ~24 (18 components + ~6 hook files)
- **Files added:** 0
- **New dependencies:** 0 — `expo-image`, `@shopify/flash-list`, `@tanstack/react-query` already installed
- **API / data changes:** none
- **Behavior changes:** faster rendering, smoother scroll, no loading flash on chip taps. One minor visible UX change: HomeScreen category chips will no longer be sticky (they scroll with the list header). This is an accepted trade-off for virtualization; revisit if it feels wrong.

## Risks

- **Memoizing with unstable props silently does nothing.** If Fix 2 is incomplete, Fix 1's wins partially evaporate. Spot-check during implementation by temporarily logging renders in one hot component.
- **`expo-image` contentFit semantics** differ subtly from RN `Image`'s `resizeMode` for edge cases. Visually verify article card + video card + gallery card after swap.
- **HomeScreen virtualization** changes the component tree enough that layout bugs (spacing, section backgrounds) are possible. Visually compare before/after on the primary scroll.

## Verification

- `npm run tsc` passes
- `npm run lint` passes
- Manual smoke test: scroll Home / News / Forum topic / Videos / Galleries; tap through category chips on each; open a forum topic with 50+ posts; confirm no visual regressions
