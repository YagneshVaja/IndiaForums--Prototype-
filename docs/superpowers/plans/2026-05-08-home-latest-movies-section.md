# Home Latest Movies Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Latest Movies preview rail (horizontal scroll of 2:3 poster tiles) to the Home tab between Web Stories and the bottom spacer.

**Architecture:** A new `LatestMoviesHomeSection` reads `useMovies('latest')`, slices to 10 movies, and renders them with a new compact `MoviePosterHomeTile` component (poster + meter badge + title + release line — slimmer than the existing Movies-screen card). Tap → existing `MovieDetail` route; See All → existing `Movies` route.

**Tech Stack:** React Native (Expo 55) · TypeScript · React Query · React Navigation · `expo-image` · `@expo/vector-icons`. Verification via `npm run tsc` + Expo Metro visual check (this codebase has no Jest tests committed).

**Spec:** [`docs/superpowers/specs/2026-05-08-home-latest-movies-section-design.md`](../specs/2026-05-08-home-latest-movies-section-design.md)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `mobile/src/features/home/components/MoviePosterHomeTile.tsx` | new | One compact 2:3 poster tile: image (or fallback), meter badge, title, release/year |
| `mobile/src/features/home/components/LatestMoviesHomeSection.tsx` | new | Section header + horizontal `ScrollView` of `MoviePosterHomeTile`s + skeleton row + empty/error guard + navigation wiring |
| `mobile/src/features/home/screens/HomeScreen.tsx` | modify | Render `<LatestMoviesHomeSection />` between `<WebStoriesHomeSection />` and the trailing `<View style={styles.spacer} />`; add `['movies']` to refresh invalidation |

No new types, hooks, APIs, or routes. Everything for the `MovieDetail` and `Movies` routes is already wired.

---

### Task 1: Create `MoviePosterHomeTile.tsx`

**Files:**
- Create: `mobile/src/features/home/components/MoviePosterHomeTile.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { memo, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Movie } from '../../../services/api';

interface Props {
  movie: Movie;
  onPress: (movie: Movie) => void;
}

// Same fallback palette as features/movies/components/MoviePosterCard.tsx —
// kept in sync deliberately so missing-poster fallbacks look consistent
// between the Home rail and the Movies grid.
const FALLBACK_GRADIENTS: { bg: string; accent: string }[] = [
  { bg: '#1F2A44', accent: '#FFB347' },
  { bg: '#3A1F22', accent: '#FF6B6B' },
  { bg: '#1A3A2E', accent: '#84E1BC' },
  { bg: '#2E1B3A', accent: '#C39BD3' },
  { bg: '#3A2E1A', accent: '#F5CB5C' },
  { bg: '#172A3A', accent: '#7CC4FF' },
];

function formatReleaseDate(
  iso: string | null,
  fallbackYear: number | null,
): string | null {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return fallbackYear ? String(fallbackYear) : null;
}

function MoviePosterHomeTileImpl({ movie, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [imgFailed, setImgFailed] = useState(false);

  const released = formatReleaseDate(movie.releaseDate, movie.startYear);
  const showMeter = movie.criticRatingCount > 0 || movie.audienceRatingCount > 0;
  const meterValue =
    movie.criticRatingCount > 0 ? movie.criticRating : movie.audienceRating;
  const fb = FALLBACK_GRADIENTS[movie.titleId % FALLBACK_GRADIENTS.length];
  const showFallback = !movie.posterUrl || imgFailed;

  return (
    <Pressable
      onPress={() => onPress(movie)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={movie.titleName}
    >
      <View style={styles.posterWrap}>
        {!showFallback ? (
          <Image
            source={{ uri: movie.posterUrl as string }}
            style={styles.poster}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View
            style={[
              styles.poster,
              styles.posterFallback,
              { backgroundColor: fb.bg },
            ]}
          >
            <Text style={[styles.fallbackEmoji, { color: fb.accent }]}>🎬</Text>
            <Text style={styles.fallbackTitle} numberOfLines={3}>
              {movie.titleName}
            </Text>
          </View>
        )}

        {showMeter ? (
          <View style={styles.meterBadge}>
            <Text style={styles.meterValue}>{Math.round(meterValue)}%</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {movie.titleName}
      </Text>
      {released ? (
        <Text style={styles.release} numberOfLines={1}>
          {released}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default memo(MoviePosterHomeTileImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      width: 132,
    },
    pressed: { opacity: 0.78 },
    posterWrap: {
      width: '100%',
      aspectRatio: 2 / 3,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: c.cardElevated,
    },
    poster: { width: '100%', height: '100%' },
    posterFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 12,
    },
    fallbackEmoji: { fontSize: 28, marginBottom: 6, opacity: 0.9 },
    fallbackTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 15,
    },
    meterBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.78)',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    meterValue: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    title: {
      marginTop: 7,
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      lineHeight: 16,
    },
    release: {
      marginTop: 2,
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '500',
    },
  });
}
```

> **Why a fixed `width: 132` instead of `flex: 1`?** Tiles live inside a horizontal `ScrollView`. Without a measurable width the row collapses. 132 × 3/2 = 198px poster → ~250px total tile height with body — comfortable on standard phone widths.

> **Why duplicate `formatReleaseDate` and `FALLBACK_GRADIENTS` instead of importing from `MoviePosterCard`?** Two small helpers, two call sites. Extracting to a shared module would cost a new file for ~25 lines. If a third movie tile appears later, extract then. The duplication is intentional and called out in the spec.

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS (no errors).

- [ ] **Step 3: Commit (only after user authorizes)**

> Per memory rule, do NOT run `git commit` until the user explicitly authorizes it.

```bash
git add mobile/src/features/home/components/MoviePosterHomeTile.tsx
git commit -m "feat(mobile): add MoviePosterHomeTile (compact home rail tile)"
```

---

### Task 2: Create `LatestMoviesHomeSection.tsx`

**Files:**
- Create: `mobile/src/features/home/components/LatestMoviesHomeSection.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Movie } from '../../../services/api';
import { useMovies } from '../../movies/hooks/useMovies';
import MoviePosterHomeTile from './MoviePosterHomeTile';

const PREVIEW_COUNT = 10;
const SKELETON_COUNT = 4;

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function LatestMoviesHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, isError } = useMovies('latest');

  const previewMovies = useMemo<Movie[]>(
    () => (data?.pages?.[0]?.movies ?? []).slice(0, PREVIEW_COUNT),
    [data],
  );

  const handleMoviePress = useCallback(
    (movie: Movie) =>
      navigation.navigate('MovieDetail', { movie }),
    [navigation],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('Movies'),
    [navigation],
  );

  if (isError && !previewMovies.length) return null;
  if (!isLoading && !previewMovies.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>LATEST MOVIES</Text>
            <Text style={styles.subtitle}>
              New releases · ratings & reviews
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [
            styles.seeAll,
            pressed && styles.seeAllPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="See all movies"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading && !previewMovies.length ? (
        <View style={styles.skeletonRow}>
          {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
            <View key={`sk-${idx}`} style={styles.skeletonCell}>
              <View style={[styles.skeleton, styles.skeletonPoster]} />
              <View style={[styles.skeleton, styles.skeletonLine]} />
              <View style={[styles.skeleton, styles.skeletonLineShort]} />
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {previewMovies.map((movie) => (
            <MoviePosterHomeTile
              key={movie.titleId}
              movie={movie}
              onPress={handleMoviePress}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 10,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    accentBar: {
      width: 3.5,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    titleCol: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    seeAllPressed: { opacity: 0.6 },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },

    row: {
      paddingHorizontal: 14,
      gap: 12,
      flexDirection: 'row',
    },
    skeletonRow: {
      paddingHorizontal: 14,
      gap: 12,
      flexDirection: 'row',
    },
    skeletonCell: {
      width: 132,
    },
    skeleton: {
      backgroundColor: c.surface,
      borderRadius: 6,
    },
    skeletonPoster: {
      width: '100%',
      aspectRatio: 2 / 3,
      borderRadius: 10,
      marginBottom: 7,
    },
    skeletonLine: {
      height: 11,
      width: '90%',
      marginTop: 4,
    },
    skeletonLineShort: {
      height: 9,
      width: '50%',
      marginTop: 6,
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS.

- [ ] **Step 3: Commit (only after user authorizes)**

```bash
git add mobile/src/features/home/components/LatestMoviesHomeSection.tsx
git commit -m "feat(mobile): add LatestMoviesHomeSection (live rail)"
```

---

### Task 3: Wire `LatestMoviesHomeSection` into `HomeScreen`

**Files:**
- Modify: `mobile/src/features/home/screens/HomeScreen.tsx`

- [ ] **Step 1: Add the import**

In `HomeScreen.tsx`, immediately after the existing line:

```tsx
import WebStoriesHomeSection from '../components/WebStoriesHomeSection';
```

…add:

```tsx
import LatestMoviesHomeSection from '../components/LatestMoviesHomeSection';
```

- [ ] **Step 2: Add `['movies']` to pull-to-refresh invalidation**

Find the existing `Promise.all` block in `handleRefresh`:

```tsx
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['banners'] }),
        queryClient.invalidateQueries({ queryKey: ['articles'] }),
        queryClient.invalidateQueries({ queryKey: ['home-forum-topics'] }),
        queryClient.invalidateQueries({ queryKey: ['home-media-galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
        queryClient.invalidateQueries({ queryKey: ['quizzes'] }),
        queryClient.invalidateQueries({ queryKey: ['webstories'] }),
      ]);
```

Replace with:

```tsx
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['banners'] }),
        queryClient.invalidateQueries({ queryKey: ['articles'] }),
        queryClient.invalidateQueries({ queryKey: ['home-forum-topics'] }),
        queryClient.invalidateQueries({ queryKey: ['home-media-galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
        queryClient.invalidateQueries({ queryKey: ['quizzes'] }),
        queryClient.invalidateQueries({ queryKey: ['webstories'] }),
        queryClient.invalidateQueries({ queryKey: ['movies'] }),
      ]);
```

The `useMovies` hook keys as `['movies', mode]`. Invalidating the `['movies']` prefix covers both `latest` and `upcoming`, which is the desired behavior on a global Home refresh.

- [ ] **Step 3: Render the section in `ListFooter`**

Locate the existing block in the `ListFooter` `useMemo`:

```tsx
        <View style={styles.sectionGap}>
          <WebStoriesHomeSection />
        </View>

        <View style={styles.spacer} />
```

Insert a new section block between them:

```tsx
        <View style={styles.sectionGap}>
          <WebStoriesHomeSection />
        </View>

        <View style={styles.sectionGap}>
          <LatestMoviesHomeSection />
        </View>

        <View style={styles.spacer} />
```

No dependency change is needed for the `ListFooter` `useMemo` — `LatestMoviesHomeSection` is parameterless and self-contained (it owns its own query, navigation, and state).

- [ ] **Step 4: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS.

- [ ] **Step 5: Visual verification — Home tab**

Run: `cd mobile; npm run start`

Open the app on a device/emulator and verify on the Home tab:

1. Scroll to the very bottom of Home (past Trending Now, Latest News, Forums, Photo Galleries, Popular Indian TV Shows, VIDEOS, FAN QUIZZES, WEB STORIES).
2. The new **LATEST MOVIES** section appears as the last content section, just before the bottom spacer. Header: red accent bar + "LATEST MOVIES" + subtitle "New releases · ratings & reviews" + right-aligned `See All ›`.
3. Below the header, a horizontally scrolling row of poster tiles. Each tile shows:
   - A 2:3 poster (real `posterUrl` via `expo-image`).
   - Meter badge in the top-right (e.g. `78%`) only when at least one rating count is non-zero.
   - 2-line title beneath the poster.
   - Release line: formatted ISO date when present, else `startYear`, else hidden entirely.
   - When `posterUrl` is missing or fails to load, the poster falls back to a deterministic colored panel (cycling through 6 palettes by `titleId % 6`) with a 🎬 emoji and the title centered.
4. Swipe horizontally → row scrolls smoothly through up to 10 tiles.
5. Tap any tile → opens `MovieDetail` with the matching movie. Back returns to Home with scroll position preserved.
6. Tap `See All` → opens the `Movies` screen. Back returns to Home.
7. Pull to refresh on Home → spinner appears, releases, the rail's tiles refresh (new server data appears if upstream changed).
8. Toggle dark mode (via Side Menu / theme toggle) → header text/accent/subtitle/See All adapt to the theme. Meter badge stays white-on-rgba-black, fallback gradient palette stays fixed (intentional — both must remain legible on top of arbitrary poster imagery / fixed dark backgrounds).
9. If the API returns zero latest movies, the section is hidden entirely (no broken empty state).

- [ ] **Step 6: Commit (only after user authorizes)**

```bash
git add mobile/src/features/home/screens/HomeScreen.tsx
git commit -m "feat(mobile): show Latest Movies section on Home after Web Stories"
```

---

## Self-review

- **Spec coverage:**
  - Compact 2:3 poster tiles in horizontal rail → Task 1 (`MoviePosterHomeTile`) + Task 2 layout. ✓
  - Real `posterUrl` with deterministic fallback gradient + 🎬 + title → Task 1 (`showFallback` branch). ✓
  - Meter badge only when at least one rating count is non-zero → Task 1 (`showMeter`, `meterValue`). ✓
  - Title (2 lines) + release/year line (hidden when neither) → Task 1 (`released` + conditional). ✓
  - Header style mirrors Videos / Fan Quizzes / Web Stories → Task 2 header styles. ✓
  - `useMovies('latest')`, slice to 10 → Task 2 `previewMovies`. ✓
  - Skeleton row of 4 placeholder tiles → Task 2 conditional. ✓
  - Hide on error/empty → Task 2 guards. ✓
  - Tile tap → `MovieDetail` with `{ movie }` → Task 2 `handleMoviePress`. ✓
  - See All → `Movies` → Task 2 `handleSeeAll`. ✓
  - Insertion in `HomeScreen` between `<WebStoriesHomeSection />` and `<View style={styles.spacer} />` → Task 3 step 3. ✓
  - `['movies']` in pull-to-refresh → Task 3 step 2. ✓
  - Theming via `makeStyles(colors)` → Tasks 1 & 2. ✓
- **Placeholder scan:** No "TBD"/"TODO"/"Similar to Task N". Every step ships full code or an exact command.
- **Type consistency:**
  - `Movie` imported from `../../../services/api` in both new files; matches the type used by `useMovies` and `MovieDetail` route param.
  - `HomeStackParamList.MovieDetail: { movie: Movie }` is satisfied by `{ movie }`.
  - `HomeStackParamList.Movies: undefined` is satisfied by `navigation.navigate('Movies')`.
  - `useMovies` returns `useInfiniteQueryResult<MoviesPage>`; `data?.pages?.[0]?.movies` matches `MoviesPage.movies: Movie[]` per the type definition.
  - `movie.titleId` used as the React `key` is `number` per `Movie` definition — fine, React accepts numeric keys.

---

## Out of scope (explicitly not in this plan)

- Modifying any file under `mobile/src/features/movies/` (existing screens, hooks, components).
- Adding new query keys, transformers, or API endpoints.
- Inline `Latest` / `Upcoming` mode toggle on the Home rail (deferred — use the dedicated Movies screen).
- Per-genre or per-language filtering on the Home preview.
- Watchlist / bookmark UI on Home tiles.
- Unit tests (this codebase has no test pattern committed yet).
