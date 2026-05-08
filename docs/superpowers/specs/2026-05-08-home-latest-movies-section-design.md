# Home — Latest Movies Section (horizontal poster rail)

**Status:** Approved (design)
**Date:** 2026-05-08
**Scope:** `mobile/` app, Home tab only.
**Reference:** Live site `https://www.indiaforums.com/` Latest Movies block (horizontal rail of 2:3 posters with title, release date, and rating meter).

---

## Goal

Add a Latest Movies preview section to the Home tab. The mobile app already has the full Movies feature (API, hook, dedicated grid screen, detail screen, write-review screen, all routes registered in `HomeStack`). This work is purely the Home preview surface — a horizontal rail of compact poster tiles linking into the existing Movies surfaces.

---

## Visual Layout

```
┌─────────────────────────────────────────────┐
│ ▌ LATEST MOVIES                See All →   │   header
│   New releases · ratings & reviews          │   subtitle
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │██78%│ │██92%│ │██65%│ │     │ │██45%│    │   2:3 poster (~132px wide)
│ │poster│ │poster│ │poster│ │poster│ │poster│   meter badge top-right
│ │     │ │     │ │     │ │     │ │     │    │   (only when ratings exist)
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘    │
│ Title 1   Title 2   Title 3   Title 4   …  │   bold title, max 2 lines
│ 14 Mar 26 21 Mar 26 28 Mar 26 4 Apr 26  …  │   release date / fallback year
│         → swipe →                            │
└─────────────────────────────────────────────┘
```

- Tile width: **132px**, poster `aspectRatio: 2 / 3` → ~198px tall poster.
- Body block: ~50px tall (title + release line).
- Total tile height: ~250px.
- Header style mirrors the recent Videos / Fan Quizzes / Web Stories sections: accent bar + uppercase title + subtitle + right-aligned `See All ›`.

---

## Components

### `mobile/src/features/home/components/MoviePosterHomeTile.tsx` (new)

Single compact poster tile. Props:

```ts
interface Props {
  movie: Movie;
  onPress: (movie: Movie) => void;
}
```

Behavior:

- Renders the real `movie.posterUrl` via `expo-image` with `cachePolicy="memory-disk"`. Local `useState` `imgFailed` flips to `true` on `onError` — falls back to a deterministic colored panel (`bg` chosen by `movie.titleId % FALLBACK_GRADIENTS.length`) with `🎬` and the title centered.
- Meter badge in the top-right shows the rounded percentage, but **only when** `criticRatingCount > 0 || audienceRatingCount > 0`. Source of percent: `criticRating` if `criticRatingCount > 0`, else `audienceRating`.
- Title: `numberOfLines={2}`, weight 700, theme-aware color.
- Release line: prefer formatted ISO date (`en-IN`, `day numeric / month short / year numeric`); when ISO is missing or unparseable, fall back to `startYear`. Hidden when neither is available.

> **Why a new tile and not reuse `MoviePosterCard`?** The existing `features/movies/components/MoviePosterCard.tsx` shows two extra rating-*count* lines beneath the title (e.g. `Critic's Rating 12` / `User Rating 247`). Those are useful on the Movies grid but read like screen-wide statistics on a Home rail. Mirroring `MoviePosterCard`'s fallback / meter logic in a slimmer Home tile keeps each surface tuned for its context. Same forking pattern used for `VideoGridTile` vs `VideoGridCard` and `WebStoryHomeTile` vs `WebStoryCard`.

### `mobile/src/features/home/components/LatestMoviesHomeSection.tsx` (new)

Section wrapper. Responsibilities:

- Calls `useMovies('latest')` from the existing hook.
- Slices first page's `movies` to a 10-tile preview.
- Renders header, horizontal `ScrollView` of `MoviePosterHomeTile`s, skeleton row when loading-without-cache, empty/error guard.
- Owns navigation: tile tap → `MovieDetail`, See All → `Movies`.

---

## Data

### Source

- Reuse `useMovies` from `mobile/src/features/movies/hooks/useMovies.ts`. Query key `['movies', 'latest']` is shared with the Movies screen — opening either surface warms the other.
- `staleTime: 2 * 60 * 1000` (already set on the hook) is fine for a home preview.

### Selection

```ts
const PREVIEW_COUNT = 10;
const previewMovies = (data?.pages?.[0]?.movies ?? []).slice(0, PREVIEW_COUNT);
```

- No featured-first filter. The `/movies/latest` endpoint already returns the right ordering.
- 10 tiles × 132px ≈ 1320px of horizontal scroll content — comfortable on standard phone widths.

---

## States

| State | UI |
|---|---|
| Loading (no cached data) | Horizontal row of 4 skeleton tiles: poster placeholder (132×198, `c.surface`, radius 10) + 2 short skeleton lines beneath |
| Loaded with ≥ 1 movie | Render up to 10 tiles in a horizontal `ScrollView` |
| Error or empty | Hide section (`return null`) — matches sibling sections |

---

## Interactions

- **Tile tap** → `navigation.navigate('MovieDetail', { movie })`. Matches the existing `HomeStackParamList.MovieDetail: { movie: Movie }` signature.
- **See All** → `navigation.navigate('Movies')`. Already registered.
- **Pull-to-refresh** on Home → `handleRefresh` adds `['movies']` to its `Promise.all` invalidation list. The prefix `['movies']` covers both `['movies', 'latest']` and `['movies', 'upcoming']`, which is the desired behavior on a global Home refresh.

---

## Integration into HomeScreen

In `mobile/src/features/home/screens/HomeScreen.tsx`:

1. Import `LatestMoviesHomeSection`.
2. Inside the `ListFooter` `useMemo`, render `<LatestMoviesHomeSection />` between `<WebStoriesHomeSection />` and the trailing `<View style={styles.spacer} />`.
3. Add `['movies']` to the `Promise.all` invalidation list in `handleRefresh`.

---

## Theming

All styles built via `useMemo(() => makeStyles(colors), [colors])`. Theme-bound: card background, borders, header text, subtitle, See All, body title, release line, skeleton background. Fixed colors: meter badge background (rgba black) and meter text (white) — these sit on top of arbitrary poster imagery and must remain legible regardless of light/dark mode. The fallback poster gradient palette is the same one used by the existing `MoviePosterCard`, intentionally hard-coded for legibility.

---

## Out of scope

- Modifying any file under `mobile/src/features/movies/` (existing screens, hooks, and components).
- Adding new API endpoints, transformers, or query keys.
- Inline `Latest` / `Upcoming` mode toggle on the Home rail (use the dedicated Movies screen for that).
- Per-genre or per-language filtering on the Home preview.
- Bookmarking / watchlist UI on Home tiles.

---

## Acceptance

- Section renders between Web Stories and the bottom spacer on Home.
- Header accent + uppercase title + subtitle + `See All ›` visually mirror the Videos / Fan Quizzes / Web Stories sections.
- Tiles render real posters with deterministic colored fallback when `posterUrl` is missing or fails to load.
- Meter badge appears in the top-right of the poster only when at least one rating count is non-zero.
- Title and release/year render correctly; release line is hidden when neither ISO date nor `startYear` is available.
- Tap any tile → opens `MovieDetail` with the corresponding `Movie`. Back returns to Home with scroll position preserved.
- See All → opens the `Movies` screen.
- Pull-to-refresh refreshes the rail alongside the rest of Home.
- `npm run tsc` passes; no new lint warnings introduced.
