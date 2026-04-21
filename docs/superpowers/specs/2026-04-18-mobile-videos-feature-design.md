# Mobile Videos Feature — Design Spec

**Date:** 2026-04-18
**Scope:** Port the prototype's Videos feature to the React Native mobile app (`mobile/`), matching the visual and behavioral patterns of the existing News and Celebrities features.

---

## 1. Goals

Bring a browsable video feed and a per-video detail view to the mobile app, backed by the real IndiaForums API. The implementation must feel native to the mobile codebase (React Query hooks, typed models, `StyleSheet`-based components, React Navigation stack routing) while visually mirroring the prototype.

## 2. Scope

**In scope (this spec):**
- `VideosScreen` — category tabs + trending strip + 2-column grid + pagination.
- `VideoDetailScreen` — YouTube WebView player, meta, share actions, expandable description, related videos.
- API integration via ported `fetchVideos` / `fetchVideoDetails`.
- Navigation wiring: `StoriesStrip` "Videos" pill → `VideosScreen`; card press → `VideoDetailScreen`.

**Deliberately out of scope:**
- Reactions (emoji reactions row in prototype's `VideoDetailScreen`).
- Comments section (static hardcoded array in prototype).
- Keywords/tags chips.
- Live-stream detection beyond the `live` flag the API already provides.
- Native video playback via `expo-video` (API surfaces only YouTube `contentId`; no direct media URLs).

## 3. Architecture

### 3.1 Feature module layout

```
mobile/src/features/videos/
  components/
    CategoryTabs.tsx
    TrendingVideoCard.tsx
    VideoGridCard.tsx
    VideoPlayer.tsx
    RelatedVideoCard.tsx
  hooks/
    useVideos.ts
    useVideoDetails.ts
  screens/
    VideosScreen.tsx
    VideoDetailScreen.tsx
```

This mirrors the existing `features/news/` and `features/celebrities/` layout.

### 3.2 Navigation

Added to `HomeStackParamList` in `mobile/src/navigation/types.ts`:

```ts
Videos: undefined;
VideoDetail: { video: Video };
```

Registered in `HomeStack.tsx` alongside the existing screens. The `StoriesStrip.handlePress` handler adds a branch for `Videos` that navigates to the new route (parallel to the existing `Celebrities` branch).

### 3.3 API layer

Port from the prototype (`indiaforums/src/services/api.js`) into `mobile/src/services/api.ts`:

- `VIDEO_CAT_TABS` — identical array; drives the category tabs.
- `Video` and `VideoDetail` TypeScript interfaces.
- `transformVideo(raw)` and `transformVideoDetail(data)` — identical logic, typed.
- `fetchVideos(page, pageSize, contentId)` → `{ videos: Video[], pagination: { currentPage, pageSize, hasNextPage } }`.
- `fetchVideoDetails(id)` → `VideoDetail | null`.

Endpoints (unchanged from prototype):
- `GET /videos/list?pageNumber=…&pageSize=…[&contentType=1000&contentId=…]`
- `GET /videos/{id}/details`

### 3.4 Data hooks (React Query)

```ts
useVideos(contentId: number | null)
  → useInfiniteQuery(['videos', contentId], ({ pageParam = 1 }) => fetchVideos(pageParam, 20, contentId))
  // getNextPageParam: lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined

useVideoDetails(id: string)
  → useQuery(['videoDetails', id], () => fetchVideoDetails(id))
```

For categories whose `contentId` is `null` (Celebrity, Sports, Music), the screen falls back to client-side filtering of the fetched pages by `video.cat`, matching the prototype behavior.

## 4. Screens

### 4.1 VideosScreen

**Layout (top to bottom):**
- `TopNavBrand` (reused from shared layout).
- `CategoryTabs` — horizontal scroll of pill-style tabs. Active tab uses the category accent color as its underline/background tint.
- Trending strip — `SectionHeader` titled "Trending Now" followed by a horizontal `FlatList` of `TrendingVideoCard`s. Source: first 4 items where `featured === true`; if fewer than 2 featured items exist, fall back to the first 4 items in the current list.
- Grid — `SectionHeader` titled "Latest Videos" (or the category name when a non-"All" tab is active) followed by a 2-column `FlatList` of `VideoGridCard`s using the remaining videos (excluding the ones already in the trending strip).
- Load-more button — visible when `hasNextPage`; calls `fetchNextPage()`.

**States:**
- Loading (first page) → skeleton shimmer cards for both trending and grid.
- Error → `ErrorState` with retry (calls `refetch()`).
- Empty (category has no matching videos) → "No videos found in this category." muted text row.

### 4.2 VideoDetailScreen

**Route param:** The list-item `Video` is passed on navigation so the detail screen can render title/thumbnail instantly; `useVideoDetails(id)` then enriches the view with `description`, `contentId` (YouTube ID), and `relatedVideos`.

**Layout (top to bottom, scrollable):**
- Header row with back button.
- 16:9 player area:
  - If `enriched.contentId` is present → `VideoPlayer` (WebView loading `https://www.youtube.com/embed/{contentId}?rel=0&modestbranding=1&playsinline=1`).
  - Else → thumbnail with a large centered play icon (non-interactive fallback).
- Breadcrumb row: `Home › {catLabel} › Videos`.
- Title (`h1`-style, wraps to 3 lines).
- Meta chips: views, time ago, duration (each separated by a dot).
- Share row: Facebook, X, WhatsApp, Copy link. Uses `Share.share` for the first three (with pre-filled text + URL) and `expo-clipboard` / `Clipboard` for the copy button. A small toast ("Link copied") shows on copy.
- Description block: `enriched.description`, truncated at 150 chars with a "Read More" / "Show Less" toggle.
- Related Videos: `SectionHeader` + vertical list of `RelatedVideoCard`. Tapping one replaces the current `VideoDetail` route using `navigation.replace` (to avoid deep stacks).

**States:**
- While `useVideoDetails` loads, keep the header, title, and meta visible using the passed-in `Video`; description/related areas show skeletons.
- On error, the description/related areas render nothing (title and player are still available).

## 5. Components

### 5.1 CategoryTabs

`ScrollView horizontal` with `Pressable` pills. Active pill uses category accent (see `CAT_ACCENT` lookup, ported from prototype). Props: `tabs: { id; label; contentId }[]`, `active: string`, `onChange: (id) => void`.

### 5.2 TrendingVideoCard

Full-width card (horizontal strip), 16:9 thumbnail, dark scrim gradient at the bottom, category chip top-left (solid accent color or red "● LIVE" when `video.live`), duration or `● LIVE` bottom-right, circular play button centered. Title + time-ago over the scrim. Matches prototype's `TrendingCard`.

### 5.3 VideoGridCard

2-column grid card. Thumbnail top (16:9), duration chip bottom-right, play-button overlay centered. Body: category chip (tinted background), title (2 lines), time-ago with a clock icon. Matches prototype's `GridCard`.

### 5.4 VideoPlayer

Thin wrapper around `react-native-webview`'s `WebView`:
- `source={{ uri: youtubeEmbedUrl }}`
- `allowsInlineMediaPlayback`, `mediaPlaybackRequiresUserAction={false}`, `javaScriptEnabled`, `domStorageEnabled`.
- Styled to a 16:9 aspect ratio using `aspectRatio: 16/9`.
- Exposes a loading state overlay while the WebView initializes.

`react-native-webview` is already a dependency (`13.16.0` in `mobile/package.json`).

### 5.5 RelatedVideoCard

Horizontal card variant used inside `VideoDetailScreen`. Thumbnail left (fixed width ~140), body right (category chip, title, time-ago). Tappable to replace the current detail view.

## 6. Types

Added to `mobile/src/services/api.ts`:

```ts
export interface Video {
  id: string;
  catId: number;
  cat: string;
  catLabel: string;
  title: string;
  timeAgo: string;
  duration: string | null;
  bg: string;
  emoji: string;
  thumbnail: string | null;
  live: boolean;
  featured: boolean;
  views: string | null;
  viewCount: number;
  commentCount: number;
  description: string;
}

export interface VideoDetail extends Video {
  contentId: string | null; // YouTube video ID
  keywords: string;
  relatedVideos: Video[];
}
```

## 7. Styling

All component styles use the mobile app's existing design language:
- Brand color `#3558F0`, text `#1A1A1A`, background `#F5F6F7`.
- Category accent palette ported verbatim from the prototype's `CAT_ACCENT`.
- Category gradients ported from `CATEGORY_GRADIENTS` — used as thumbnail fallback backgrounds when `thumbnail` is null.
- `StyleSheet.create` per component, no inline style objects except for dynamic colors/gradients.

## 8. Error handling

- Network errors from React Query → `ErrorState` on list screen; silent on detail screen's related-videos block.
- Missing `contentId` on detail → thumbnail-only fallback, no player.
- Empty related-videos array → section is hidden entirely.
- Copy-link failure → no toast (best-effort).

## 9. Testing plan

Manual, via Expo dev client:
- Launch app → tap "Videos" pill in Stories strip on Home → Videos screen loads.
- Switch between category tabs → list refetches and updates; "All" shows mixed content.
- Scroll grid, tap "Load More" → next page appends without flicker.
- Tap a trending card → detail opens, player loads YouTube embed, description expandable.
- Tap a related video in detail → detail replaces with new video.
- Toggle airplane mode → ErrorState appears with retry.
- Tap back → returns to list, scroll position preserved.

Type check (`npm run typecheck` if present) and Metro bundling must succeed.

## 10. Files touched

**New:**
- `mobile/src/features/videos/components/CategoryTabs.tsx`
- `mobile/src/features/videos/components/TrendingVideoCard.tsx`
- `mobile/src/features/videos/components/VideoGridCard.tsx`
- `mobile/src/features/videos/components/VideoPlayer.tsx`
- `mobile/src/features/videos/components/RelatedVideoCard.tsx`
- `mobile/src/features/videos/hooks/useVideos.ts`
- `mobile/src/features/videos/hooks/useVideoDetails.ts`
- `mobile/src/features/videos/screens/VideosScreen.tsx`
- `mobile/src/features/videos/screens/VideoDetailScreen.tsx`

**Modified:**
- `mobile/src/services/api.ts` — add `Video`/`VideoDetail` types, `VIDEO_CAT_TABS`, `CAT_ACCENT`, `fetchVideos`, `fetchVideoDetails`, plus transform helpers.
- `mobile/src/navigation/types.ts` — add `Videos` and `VideoDetail` to `HomeStackParamList`.
- `mobile/src/navigation/HomeStack.tsx` — register both screens.
- `mobile/src/features/home/components/StoriesStrip.tsx` — navigate to `Videos` on the Videos pill press.
- `mobile/package.json` — no new dependencies required (`react-native-webview` already present).

## 11. Open questions

None at this time. Reactions, comments, and tags are tracked as potential follow-ups (not this spec).
