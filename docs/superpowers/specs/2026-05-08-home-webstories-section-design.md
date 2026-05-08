# Home — Web Stories Section (live-site style)

**Status:** Approved (design)
**Date:** 2026-05-08
**Scope:** `mobile/` app, Home tab only.
**Reference:** Live site `https://www.indiaforums.com` Web Stories rail (9:16 cover-only cards, title overlaid on a bottom scrim, horizontally scrollable). The mobile prototype already has the live API + dedicated WebStories grid screen + a polished player.

---

## Goal

Replace the dead static `WebStoriesStrip` on Home with a live, navigable Web Stories rail that:

1. Reads from the real `/webstories` endpoint via the existing `useWebStories()` hook.
2. Tap-opens the existing `WebStoryPlayerScreen` (auto-advancing, slide-by-slide player).
3. Renders close to the live indiaforums.com aesthetic: 9:16 portrait cover cards, title overlaid on a bottom scrim, no separate body block.

This is both a **rewrite** (the current strip uses static seed data and has no navigation) and a **lightweight visual refresh** to match the brand's web rail.

---

## Visual Layout

```
┌──────────────────────────────────────────────┐
│ ▌ WEB STORIES                  See All →    │   header
│   Tap to play · auto-advances                │   subtitle
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │■■■■■│ │■■■■■│ │■■■■■│ │■■■■■│ │■■■■■│    │   5 progress dots
│ │cover│ │cover│ │cover│ │cover│ │cover│    │   9:16 cover (image or
│ │image│ │image│ │image│ │image│ │image│    │   gradient fallback)
│ │     │ │     │ │     │ │     │ │     │    │
│ │▬▬▬▬▬│ │▬▬▬▬▬│ │▬▬▬▬▬│ │▬▬▬▬▬│ │▬▬▬▬▬│    │   bottom scrim
│ │Title│ │Title│ │Title│ │Title│ │Title│    │   title (2 lines, white)
│ │ 2d  │ │ 1d  │ │ 4h  │ │ 6h  │ │ 1w  │    │   time-ago pill, bottom-right
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘    │
│           → swipe                            │
└──────────────────────────────────────────────┘
```

- Tile width: **118px**, `aspectRatio: 9 / 16` → roughly 210px tall.
- Cover renders the real `story.coverImage` URL via `expo-image`; on missing URL or `onError`, falls back to a `LinearGradient` built from `story.coverBg.colors` and `story.coverBg.angle`.
- Top scrim (rgba black → transparent, 60px tall) ensures the 5 progress dots stay legible on bright covers.
- Bottom scrim (transparent → rgba(0,0,0,0.65), ~50% of cover height) anchors the title overlay and time pill.
- Header style mirrors `VideosHomeSection` and `QuizzesHomeSection`: accent bar + uppercase title + subtitle + right-aligned `See All ›`.

---

## Components

### `mobile/src/features/home/components/WebStoriesHomeSection.tsx` (new)

Section wrapper. Responsibilities:

- Calls `useWebStories()` to read the cached web-stories list.
- Slices the first page's stories to a 10-tile preview.
- Renders header, horizontal `ScrollView` of `WebStoryHomeTile`s, loading skeleton row, empty/error guard.
- Owns navigation: tile tap → `WebStoryPlayer` with the preview slice + chosen index, See All → `WebStories`.

### `mobile/src/features/home/components/WebStoryHomeTile.tsx` (new)

Single 9:16 cover-only tile. Props:

```ts
interface Props {
  story: WebStorySummary;
  onPress: (story: WebStorySummary) => void;
}
```

- Uses `expo-image` with `cachePolicy="memory-disk"` for cover. Local `useState` `imgFailed` flips to `true` on `onError`.
- Renders `LinearGradient` fallback when `coverImage` is empty *or* `imgFailed === true`. Gradient direction comes from `coverBg.angle` via a local `angleToStartEnd(angle)` helper (mirrors the one in `features/webstories/components/WebStoryCard.tsx`; duplicated rather than extracted because there are only two call sites).
- Top scrim + 5 progress dots overlay (`rgba(255,255,255,0.6)` bars).
- Bottom scrim gradient anchors a 2-line title (`numberOfLines={2}`, `fontWeight: '800'`, white, letter-spacing -0.2) and a tiny time pill (`rgba(0,0,0,0.55)` background, white text, only rendered when `timeAgo` is non-empty).

> **Why a new tile component instead of reusing `WebStoryCard`?** The grid-screen card adds a body block under the cover (title + time *below* the image). The chosen home aesthetic puts the title *inside* the cover. Forking is the right move; sharing would push two contradictory layouts onto one component.

### Files removed (cleanup)

- `mobile/src/features/home/components/WebStoriesStrip.tsx` — the static-data strip we're replacing.
- `mobile/src/features/home/data/webStories.ts` — the seed it consumed.

A repo-wide grep for `WEB_STORIES` and `WebStoriesStrip` confirmed `HomeScreen.tsx` is the only consumer of both. Removing them resolves the [mobile/CLAUDE.md](../../mobile/CLAUDE.md) gotcha note about `data/webStories.ts` being intentional-but-flag-when-replaced.

---

## Data

### Source

- Reuse `useWebStories()` from `mobile/src/features/webstories/hooks/useWebStories.ts`. Query key `['webstories']`. `staleTime: 5 * 60 * 1000` (already set).
- The hook is `useInfiniteQuery`; on Home we only consume page 1 — no prefetch of additional pages from the strip.

### Selection

```ts
const PREVIEW_COUNT = 10;
const previewStories = (data?.pages?.[0]?.stories ?? []).slice(0, PREVIEW_COUNT);
```

- No featured-first filter. The API already orders by recency, which matches the live site's behavior on this rail.
- A static `PREVIEW_COUNT = 10` keeps the strip narrow on tall feeds (~10×118 = ~1200px of horizontal scroll). Tweakable in one place if product wants a longer rail.

---

## States

| State | UI |
|---|---|
| Loading (no cached data) | Horizontal row of 5 skeleton tiles in a non-scrolling `View` (same 9:16 aspect, `c.surface` background, 14px border-radius) |
| Loaded with ≥ 1 story | Render up to 10 tiles in a horizontal `ScrollView` |
| Error or empty | Hide section (`return null`) |

---

## Interactions

- **Tile tap** → `navigation.navigate('WebStoryPlayer', { stories: previewStories, index })`. Passing the *preview slice* (not the full paginated list) as the player's `stories` array means the player's next-story navigation steps through the same set the user saw on Home — predictable, no surprise jumps into stories that weren't on screen. Users who want the full set drill in via See All.
- **See All** → `navigation.navigate('WebStories')`.
- **Pull-to-refresh** on Home → `handleRefresh` adds `['webstories']` to its `Promise.all` invalidation list.

---

## Integration into HomeScreen

In `mobile/src/features/home/screens/HomeScreen.tsx`:

1. Remove the `WebStoriesStrip` import.
2. Remove the `import { WEB_STORIES }` line.
3. Remove the `PREVIEW_WEB_STORIES` constant.
4. Remove the `<WebStoriesStrip stories={PREVIEW_WEB_STORIES} onSeeAll={() => {}} />` call.
5. Add the `WebStoriesHomeSection` import.
6. Render `<WebStoriesHomeSection />` in the same place inside `ListFooter`, between `<QuizzesHomeSection />` and the trailing `<View style={styles.spacer} />`.
7. Add `['webstories']` to the `Promise.all` invalidation list in `handleRefresh`.

---

## Theming

All styles built via `useMemo(() => makeStyles(colors), [colors])`. Header/subtitle/skeleton color from theme; cover overlays (scrims, progress dots, title color, time pill background) use fixed rgba values because they sit on top of arbitrary cover imagery and must remain legible regardless of light/dark mode.

---

## Out of scope

- Modifying any file under `mobile/src/features/webstories/` (the existing player and grid screen).
- Adding new API endpoints, transformers, or query keys.
- Story-bookmarking / read-tracking / "new since last visit" highlighting.
- Auto-advance preview animations on the home tiles.
- Per-category or featured-first filtering on the strip.

---

## Acceptance

- The strip on Home renders **live** stories from `/webstories`, not static seed data.
- Section sits in the same position the dead strip occupied (after Fan Quizzes, last content section before the spacer).
- Header accent + uppercase title + subtitle + `See All ›` visually mirror the Videos and Fan Quizzes sections.
- Tile shows real cover image with gradient fallback, 5 progress dots, title overlay, time pill.
- Tile tap opens the `WebStoryPlayer` at the correct index; back returns to Home with scroll position preserved.
- See All opens the `WebStoriesScreen`.
- Pull-to-refresh refreshes the strip alongside the rest of Home.
- The orphaned `WebStoriesStrip.tsx` and `data/webStories.ts` files no longer exist in the tree.
- `npm run tsc` passes; no new lint warnings introduced.
