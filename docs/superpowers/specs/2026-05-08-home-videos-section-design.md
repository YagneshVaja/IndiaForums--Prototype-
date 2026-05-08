# Home — Videos Section (2×2 Grid)

**Status:** Approved (design)
**Date:** 2026-05-08
**Scope:** `mobile/` app, Home tab only.
**Reference:** Live site `https://www.indiaforums.com` Videos block + web prototype `indiaforums/src/components/sections/VideoSection.jsx`.

---

## Goal

Add a Videos section to the Home tab that previews recent videos and links into the existing Videos screen. Renders directly **after** the "Popular Indian TV Shows" (`ChannelsSection`) and **before** the Web Stories strip.

The mobile app already has the videos infra (API, hook, full Videos screen, VideoDetail screen, navigation routes). This work is purely the home-feed preview surface.

---

## Visual Layout

```
┌──────────────────────────────────────────────┐
│ ▌ VIDEOS                          See All → │   header
│   Latest from across the platform            │   subtitle
├────────────────────────┬─────────────────────┤
│ ┌────────────────────┐ │ ┌─────────────────┐ │
│ │   16:9 thumbnail   │ │ │  16:9 thumbnail │ │   tile
│ │   ▶ play overlay   │ │ │  ▶ play overlay │ │
│ │              3:42  │ │ │           5:12  │ │   duration pill
│ └────────────────────┘ │ └─────────────────┘ │
│ Title (max 2 lines)    │ Title (max 2 lines) │
│ 12K views · 2d         │ 8.4K views · 1d     │
├────────────────────────┼─────────────────────┤
│ (tile 3)               │ (tile 4)            │
└────────────────────────┴─────────────────────┘
```

- 2×2 vertical grid (4 tiles total). No horizontal swipe.
- 16:9 thumbnail per tile, centered translucent play button overlay, duration pill bottom-right.
- `LIVE` badge top-left only when `video.live === true`.
- 2-line clamped title, single-line meta line below (`views · timeAgo`).

### Header

- Accent bar + bold title (`VIDEOS`) — matches `ChannelsSection` header style (`accentBar` + uppercase title) so the two sections feel like siblings.
- Subtitle: small tertiary-color line under the title.
- Right-aligned `See All →` pressable that navigates to the Videos screen.

---

## Components

### `mobile/src/features/home/components/VideosHomeSection.tsx` (new)

Section wrapper. Responsibilities:

- Calls `useVideos(null)` to read the cached "all videos" list.
- Picks the first 4 videos to display (featured-first, see *Data selection* below).
- Renders the section header + 2×2 grid of `VideoGridTile`.
- Handles loading skeleton, hides on error/empty.
- Owns navigation: tile tap → `VideoDetail`, See All → `Videos`.

### `mobile/src/features/home/components/VideoGridTile.tsx` (new)

A single tile. Props:

```ts
interface Props {
  video: Video;             // from src/services/api
  onPress: (v: Video) => void;
}
```

- Uses `expo-image` for thumbnail (with `cachePolicy="memory-disk"`).
- Overlay: semi-transparent dark scrim + circular play button (matches web prototype).
- Duration pill in bottom-right when `video.duration` is set.
- LIVE badge in top-left when `video.live === true`.
- Title with `numberOfLines={2}`, meta line: `${views} views · ${timeAgo}` (omit `views` half if `video.views` is null).

> **Why a new tile component instead of reusing `features/videos/components/VideoGridCard`?** That component is sized/styled for the dedicated Videos screen (different padding, different meta line). Keeping the home tile separate avoids cross-coupling between two different visual contexts; sharing would force one of them to compromise.

---

## Data

### Source

- Reuse the existing `useVideos(contentId: number | null)` hook from `mobile/src/features/videos/hooks/useVideos.ts`. Pass `null` to get the "all categories" list.
- React Query `queryKey: ['videos', 'all']` is shared with the Videos screen, so opening either surface warms the cache for the other.
- `staleTime: 2 * 60 * 1000` (already set on the hook) is acceptable for a home preview.

### Selection logic

```ts
const allVideos = (data?.pages ?? []).flatMap(p => p.videos);
const featured = allVideos.filter(v => v.featured);
const preview = (featured.length >= 4 ? featured : allVideos).slice(0, 4);
```

Featured-first, fall back to head of list. 4 videos exactly — never under-fill.

---

## States

| State | UI |
|---|---|
| Loading (no cached data) | 4 skeleton tiles in the grid (matches `LoadingState`/skeleton pattern used elsewhere) |
| Loaded with ≥ 4 videos | Render full section |
| Loaded with < 4 videos | Render section with whatever is available, no padding placeholders |
| Error | Hide the section (return `null`) — same approach `ForumsSection` uses for empty/error |
| Empty | Hide the section |

---

## Interactions

- **Tile tap** → `navigation.navigate('VideoDetail', { video })`. The route is already registered in `HomeStack`.
- **See All** → `navigation.navigate('Videos')`. Already registered in `HomeStack`.
- **Pull-to-refresh** on Home → existing `handleRefresh` adds `['videos']` to its `Promise.all` invalidation list so the section refreshes alongside the rest of Home.

---

## Integration into HomeScreen

In `mobile/src/features/home/screens/HomeScreen.tsx`, inside the `ListFooter`, insert a new section between `ChannelsSection` and `WebStoriesStrip`:

```tsx
<View style={styles.sectionGap}>
  <ChannelsSection />
</View>

<View style={styles.sectionGap}>
  <VideosHomeSection />
</View>

<View style={styles.sectionGap}>
  <WebStoriesStrip stories={PREVIEW_WEB_STORIES} onSeeAll={() => {}} />
</View>
```

Add `['videos']` to the `Promise.all` invalidation list in `handleRefresh` so pull-to-refresh covers this section.

---

## Theming

All styles built via `useMemo(() => makeStyles(colors), [colors])`, consuming `ThemeColors` tokens (`c.card`, `c.text`, `c.textTertiary`, `c.border`, `c.primary`, `c.primarySoft`). No hardcoded hex values except the play-overlay scrim (`rgba(0,0,0,0.35)`) and the duration pill background (matches web prototype's translucent black) which are intentionally not theme-bound.

---

## Out of scope

- Modifying the existing `VideosScreen` or `VideoDetailScreen`.
- Adding new API endpoints or transformers (existing `fetchVideos` covers it).
- Per-category filtering on the home preview (Videos screen handles that).
- Auto-play / inline video preview on the home tiles.

---

## Acceptance

- Section renders between Popular Indian TV Shows and Web Stories on Home.
- Header accent + title styling visually mirrors `ChannelsSection`.
- 2×2 grid of 16:9 tiles with play overlay, duration pill, LIVE badge (when applicable), 2-line title, meta line.
- Tile tap opens `VideoDetail`; See All opens `Videos`.
- Pull-to-refresh refreshes the section.
- `npm run tsc` passes; no new lint warnings.
