# Celebrity Profile — Tier 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Commit policy for this repo:** the user has a standing rule "never auto-commit; always ask first." Each task's commit step is the suggested commit message — pause and confirm with the user before running `git commit`.

**Goal:** Bring `CelebrityDetailScreen` closer to the live indiaforums.com profile by adding Filmography and Discussion tabs and exposing extended biography fields the API already returns.

**Architecture:** Tier-1 surfaces use endpoints we already have (`/movies/by-mode?mode=3` for filmography, `/forums/{forumId}/topics` for discussion, and additional `personInfos` keys from the existing biography endpoint for body measurements). The 2-tab layout in `CelebrityDetailScreen` becomes 4 tabs: **Biography · Filmography · Discussion · Fans**. Each new tab follows the existing Fans tab pattern: `useInfiniteQuery` hook → `FlashList`/`FlatList` of rows → `ErrorBlock`/empty/loading states.

**Tech Stack:** Expo 55 / React Native 0.83 / TypeScript / @tanstack/react-query / @shopify/flash-list / NativeWind tokens via `useThemeStore`.

**Spec:** [docs/superpowers/specs/2026-05-08-celebrity-profile-tier1-design.md](../specs/2026-05-08-celebrity-profile-tier1-design.md)

---

## File map

```
mobile/src/services/api.ts
  ├── CelebrityBiography           (modify: add chest, waist, biceps, eyeColor, hairColor, forumId)
  ├── transformBiography           (modify: parse new personInfos keys + person.forumId)
  └── fetchCelebrityFilmography    (new function)

mobile/src/features/celebrities/
├── utils/parseBioHtml.ts                    (modify: add computeAge helper)
├── components/
│   ├── BiographyTab.tsx                     (modify: render chest/waist/biceps/eye/hair, age)
│   ├── FilmographyTab.tsx                   (new)
│   ├── FilmographyRow.tsx                   (new)
│   ├── DiscussionTab.tsx                    (new)
│   └── ForumTopicRow.tsx                    (new)
├── hooks/
│   ├── useCelebrityFilmography.ts           (new)
│   └── useCelebrityDiscussion.ts            (new)
└── screens/CelebrityDetailScreen.tsx        (modify: 4-tab strip, 4-way tab body)
```

---

## Task 1: Extend `CelebrityBiography` type and parser

**Files:**
- Modify: `mobile/src/services/api.ts` — interface around line 469, transformer around line 1050.

- [ ] **Step 1: Extend the `CelebrityBiography` interface**

In `mobile/src/services/api.ts`, locate `export interface CelebrityBiography {` (around line 469). After the existing `weight: string;` line, add:

```ts
  chest: string;
  waist: string;
  biceps: string;
  eyeColor: string;
  hairColor: string;
```

After the existing `instagram: string;` (last field), add:

```ts
  forumId: number;
```

- [ ] **Step 2: Update `transformBiography` to populate the new fields**

Locate `function transformBiography(data: any)` (around line 1050). Inside the returned object, after the `weight:` line, add:

```ts
    chest:         (infoMap['Chest (approx.)']  || [])[0] || '',
    waist:         (infoMap['Waist (approx.)']  || [])[0] || '',
    biceps:        (infoMap['Biceps (approx.)'] || [])[0] || '',
    eyeColor:      (infoMap['Eye Color']  || [])[0] || '',
    hairColor:     (infoMap['Hair Color'] || [])[0] || '',
```

After the `instagram:` line (last entry), add:

```ts
    forumId:       Number(person.forumId ?? person.alternateForumId ?? 0),
```

- [ ] **Step 3: Update the mock biography in `getMockBiography`**

Locate `function getMockBiography(personId: string): CelebrityBiography {` (around line 1532). Add the new fields to the returned object so the type stays satisfied. Suggested values:

```ts
    chest: '40"',
    waist: '32"',
    biceps: '15"',
    eyeColor: 'Brown',
    hairColor: 'Black',
    // …existing fields…
    forumId: 0,
```

(Place `forumId: 0` at the bottom after `instagram`.)

- [ ] **Step 4: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 5: Commit (ask user first)**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(mobile): expose body-measurements + forumId on CelebrityBiography"
```

---

## Task 2: Add `computeAge` helper

**Files:**
- Modify: `mobile/src/features/celebrities/utils/parseBioHtml.ts`

- [ ] **Step 1: Append the helper to the bottom of the file**

After the existing `joinList` export (around line 130), append:

```ts
export function computeAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthdayThisYear =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/utils/parseBioHtml.ts
git commit -m "feat(mobile): add computeAge helper for celebrity DOB"
```

---

## Task 3: Render new physical fields and age in `BiographyTab`

**Files:**
- Modify: `mobile/src/features/celebrities/components/BiographyTab.tsx`

- [ ] **Step 1: Update the import line**

Change the existing import from `parseBioHtml` to also pull in `computeAge`:

```ts
import { parseBioHtml, joinList, formatDateString, computeAge, type BioImage } from '../utils/parseBioHtml';
```

- [ ] **Step 2: Update the `Personal Info` `FactsCard` items array**

Find the `<FactsCard title="Personal Info" …>` block. Replace the `Date of Birth` line with:

```tsx
                biography.birthDate ? {
                  label: 'Date of Birth',
                  value: (() => {
                    const dob = formatDateString(biography.birthDate);
                    const age = computeAge(biography.birthDate);
                    return age != null ? `${dob} · Age ${age}` : dob;
                  })(),
                } : null,
```

- [ ] **Step 3: Expand the `Physical` `FactsCard` items array**

Replace the existing `Physical` block:

```tsx
            <FactsCard
              title="Physical"
              icon="📏"
              items={[
                biography.height    ? { label: 'Height',     value: biography.height }    : null,
                biography.weight    ? { label: 'Weight',     value: biography.weight }    : null,
                biography.chest     ? { label: 'Chest',      value: biography.chest }     : null,
                biography.waist     ? { label: 'Waist',      value: biography.waist }     : null,
                biography.biceps    ? { label: 'Biceps',     value: biography.biceps }    : null,
                biography.eyeColor  ? { label: 'Eye Color',  value: biography.eyeColor }  : null,
                biography.hairColor ? { label: 'Hair Color', value: biography.hairColor } : null,
              ]}
            />
```

(The `FactsCard` component already hides itself if `items` ends up empty after filtering, so adding rows that are sometimes empty is safe.)

- [ ] **Step 4: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 5: Visual smoke test**

Start the app (`cd mobile && npm run start`) and open a celebrity with rich data (e.g., Salman Khan, personId `3`). Confirm:
- "Date of Birth" row shows `December 27, 1965 · Age 60` (or current age).
- "Physical" card now lists Chest / Waist / Biceps / Eye Color / Hair Color rows when the API returns them.

- [ ] **Step 6: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/components/BiographyTab.tsx
git commit -m "feat(mobile): show body measurements and age on celebrity biography"
```

---

## Task 4: Add `fetchCelebrityFilmography` to `api.ts`

**Files:**
- Modify: `mobile/src/services/api.ts`

- [ ] **Step 1: Add the new function**

Locate `export async function fetchCelebrityFans` (around line 1278). Immediately above it (so all `/celebrities/...` person-scoped functions cluster together), insert:

```ts
/**
 * Movies associated with a celebrity, all roles.
 * Backend route: GET /movies/by-mode?mode=3&id={personId}
 * Mode 3 = "movies for a person, any role". Confirmed working against real
 * personIds; reuses the same Movie shape returned by /movies.
 */
export async function fetchCelebrityFilmography(
  personId: string,
  page = 1,
  pageSize = 24,
): Promise<MoviesPage> {
  try {
    const { data } = await apiClient.get('/movies/by-mode', {
      params: { mode: 3, id: personId, page, pageSize },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = data ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movies: Movie[] = (raw.movies || []).map((m: any) => ({
      titleId:             Number(m.titleId),
      titleName:           String(m.titleName ?? ''),
      startYear:           m.startYear ?? null,
      pageUrl:             String(m.pageUrl ?? ''),
      posterUrl:           m.posterUrl ?? null,
      hasThumbnail:        !!m.hasThumbnail,
      releaseDate:         m.releaseDate ?? null,
      titleShortDesc:      m.titleShortDesc ?? null,
      titleTypeId:         Number(m.titleTypeId ?? 0),
      audienceRating:      Number(m.audienceRating ?? 0),
      criticRating:        Number(m.criticRating ?? 0),
      audienceRatingCount: Number(m.audienceRatingCount ?? 0),
      criticRatingCount:   Number(m.criticRatingCount ?? 0),
      averageRating:       Number(m.averageRating ?? 0),
    }));
    return {
      movies,
      totalCount: Number(raw.totalCount ?? movies.length),
      pageNumber: Number(raw.pageNumber ?? page),
      pageSize:   Number(raw.pageSize ?? pageSize),
      totalPages: Number(raw.totalPages ?? 1),
    };
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchCelebrityFilmography failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return { movies: [], totalCount: 0, pageNumber: page, pageSize, totalPages: 1 };
  }
}
```

Note: this function deliberately returns an *empty* page on error rather than mock data, so the UI shows a real error / empty state.

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(mobile): add fetchCelebrityFilmography (/movies/by-mode mode=3)"
```

---

## Task 5: Add `useCelebrityFilmography` hook

**Files:**
- Create: `mobile/src/features/celebrities/hooks/useCelebrityFilmography.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchCelebrityFilmography } from '../../../services/api';
import type { MoviesPage } from '../../../services/api';

export function useCelebrityFilmography(personId: string) {
  return useInfiniteQuery<MoviesPage>({
    queryKey: ['celebrity', personId, 'filmography'],
    queryFn: ({ pageParam }) =>
      fetchCelebrityFilmography(personId, (pageParam as number) ?? 1, 24),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageNumber < last.totalPages ? last.pageNumber + 1 : undefined,
    enabled: !!personId,
    staleTime: 10 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/hooks/useCelebrityFilmography.ts
git commit -m "feat(mobile): add useCelebrityFilmography infinite-query hook"
```

---

## Task 6: Build `FilmographyRow` component

**Files:**
- Create: `mobile/src/features/celebrities/components/FilmographyRow.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { Movie } from '../../../services/api';
import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  movie: Movie;
}

const TITLE_TYPE_LABEL: Record<number, string> = {
  1: 'Movie',
  2: 'Short Film',
  3: 'TV Show',
  4: 'Web Series',
};

function FilmographyRowImpl({ movie }: Props) {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const rating = movie.averageRating > 0
    ? movie.averageRating
    : movie.audienceRating > 0
      ? movie.audienceRating
      : movie.criticRating > 0
        ? movie.criticRating
        : null;

  const subtitleParts: string[] = [];
  if (movie.startYear) subtitleParts.push(String(movie.startYear));
  const typeLabel = TITLE_TYPE_LABEL[movie.titleTypeId];
  if (typeLabel) subtitleParts.push(typeLabel);

  return (
    <Pressable
      onPress={() => navigation.navigate('MovieDetail', { movie })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={movie.titleName}
    >
      {movie.posterUrl ? (
        <Image source={{ uri: movie.posterUrl }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Ionicons name="film-outline" size={22} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{movie.titleName}</Text>
        {subtitleParts.length > 0 && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitleParts.join(' · ')}</Text>
        )}
        {rating != null && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#F5A623" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const FilmographyRow = React.memo(FilmographyRowImpl);
export default FilmographyRow;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 14,
      marginBottom: 8,
      padding: 10,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
    poster: { width: 60, height: 80, borderRadius: 8, backgroundColor: c.surface },
    posterPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 4 },
    title: { fontSize: 14, fontWeight: '700', color: c.text, lineHeight: 18 },
    subtitle: { fontSize: 12, color: c.textSecondary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    ratingText: { fontSize: 12, color: c.text, fontWeight: '600' },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/components/FilmographyRow.tsx
git commit -m "feat(mobile): add FilmographyRow card for celebrity filmography"
```

---

## Task 7: Build `FilmographyTab`

**Files:**
- Create: `mobile/src/features/celebrities/components/FilmographyTab.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { Movie } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import FilmographyRow from './FilmographyRow';
import Spinner from './Spinner';
import ErrorBlock from './ErrorBlock';

interface Props {
  movies: Movie[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

export default function FilmographyTab({
  movies, isLoading, isError, hasNextPage, isFetchingNextPage, onLoadMore, onRetry,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (isLoading) return <Spinner text="Loading filmography..." />;
  if (isError)   return <ErrorBlock message="Couldn't load filmography" onRetry={onRetry} />;
  if (movies.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyText}>No filmography listed</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={movies}
      keyExtractor={(m) => String(m.titleId)}
      estimatedItemSize={108}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => <FilmographyRow movie={item} />}
      ListFooterComponent={
        hasNextPage ? (
          <Pressable style={styles.loadMore} onPress={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.loadMoreText}>Load more</Text>}
          </Pressable>
        ) : null
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { paddingVertical: 12 },
    empty: { alignItems: 'center', padding: 40, gap: 10 },
    emptyIcon: { fontSize: 36 },
    emptyText: { fontSize: 13, color: c.textSecondary },
    loadMore: {
      alignSelf: 'center',
      marginTop: 6,
      marginHorizontal: 14,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.primary,
    },
    loadMoreText: { color: c.primary, fontWeight: '700', fontSize: 13 },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/components/FilmographyTab.tsx
git commit -m "feat(mobile): add FilmographyTab list with infinite scroll"
```

---

## Task 8: Add `useCelebrityDiscussion` hook

**Files:**
- Create: `mobile/src/features/celebrities/hooks/useCelebrityDiscussion.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchForumTopics } from '../../../services/api';
import type { ForumTopicsPage } from '../../../services/api';

export function useCelebrityDiscussion(forumId: number | null) {
  return useInfiniteQuery<ForumTopicsPage>({
    queryKey: ['celebrity', 'discussion', forumId ?? 0],
    queryFn: ({ pageParam }) =>
      fetchForumTopics(forumId ?? 0, (pageParam as number) ?? 1, 20),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.pageNumber + 1 : undefined,
    enabled: !!forumId && forumId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/hooks/useCelebrityDiscussion.ts
git commit -m "feat(mobile): add useCelebrityDiscussion hook backed by /forums/{forumId}/topics"
```

---

## Task 9: Build `ForumTopicRow` component

**Files:**
- Create: `mobile/src/features/celebrities/components/ForumTopicRow.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { ForumTopic } from '../../../services/api';
import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  topic: ForumTopic;
}

function ForumTopicRowImpl({ topic }: Props) {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={() => navigation.navigate('TopicDetail', { topic })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={topic.title}
    >
      <View style={styles.accentBar} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>
        {topic.description ? (
          <Text style={styles.description} numberOfLines={2}>{topic.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="chatbubbles-outline" size={12} color={colors.primary} />
          <Text style={styles.metaText}>
            {topic.replies} {topic.replies === 1 ? 'reply' : 'replies'}
          </Text>
          {topic.views > 0 && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{topic.views} views</Text>
            </>
          )}
          {topic.lastTime ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>{topic.lastTime}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const ForumTopicRow = React.memo(ForumTopicRowImpl);
export default ForumTopicRow;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 14,
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
    accentBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c.primary },
    body: { flex: 1 },
    title: { fontSize: 14, fontWeight: '800', color: c.text, lineHeight: 19 },
    description: { marginTop: 4, fontSize: 12.5, lineHeight: 17, color: c.textSecondary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' },
    metaText: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    metaDot: { fontSize: 11, color: c.textTertiary },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/components/ForumTopicRow.tsx
git commit -m "feat(mobile): add ForumTopicRow card for celebrity discussion"
```

---

## Task 10: Build `DiscussionTab`

**Files:**
- Create: `mobile/src/features/celebrities/components/DiscussionTab.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import ForumTopicRow from './ForumTopicRow';
import Spinner from './Spinner';
import ErrorBlock from './ErrorBlock';

interface Props {
  forumId: number | null;
  bioLoading: boolean;
  topics: ForumTopic[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

export default function DiscussionTab({
  forumId, bioLoading, topics, isLoading, isError,
  hasNextPage, isFetchingNextPage, onLoadMore, onRetry,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (bioLoading) return <Spinner text="Loading discussion..." />;
  if (!forumId || forumId <= 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>No discussion forum for this celebrity yet</Text>
      </View>
    );
  }
  if (isLoading) return <Spinner text="Loading discussion..." />;
  if (isError)   return <ErrorBlock message="Couldn't load discussion" onRetry={onRetry} />;
  if (topics.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>No topics yet</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={topics}
      keyExtractor={(t) => String(t.id)}
      estimatedItemSize={104}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => <ForumTopicRow topic={item} />}
      ListFooterComponent={
        hasNextPage ? (
          <Pressable style={styles.loadMore} onPress={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.loadMoreText}>Load more</Text>}
          </Pressable>
        ) : null
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { paddingVertical: 12 },
    empty: { alignItems: 'center', padding: 40, gap: 10 },
    emptyIcon: { fontSize: 36 },
    emptyText: { fontSize: 13, color: c.textSecondary, textAlign: 'center' },
    loadMore: {
      alignSelf: 'center',
      marginTop: 6,
      marginHorizontal: 14,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.primary,
    },
    loadMoreText: { color: c.primary, fontWeight: '700', fontSize: 13 },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/components/DiscussionTab.tsx
git commit -m "feat(mobile): add DiscussionTab for celebrity forum topics"
```

---

## Task 11: Wire 4 tabs into `CelebrityDetailScreen`

**Files:**
- Modify: `mobile/src/features/celebrities/screens/CelebrityDetailScreen.tsx`

- [ ] **Step 1: Update imports and types**

At the top of the file, add the new imports and update the type alias:

```ts
import FilmographyTab from '../components/FilmographyTab';
import DiscussionTab from '../components/DiscussionTab';
import { useCelebrityFilmography } from '../hooks/useCelebrityFilmography';
import { useCelebrityDiscussion } from '../hooks/useCelebrityDiscussion';
import type { Movie, ForumTopic } from '../../../services/api';
```

Replace the existing `TABS` constant and `tab` state type:

```ts
type TabId = 'biography' | 'filmography' | 'discussion' | 'fans';
const TABS: { id: TabId; label: string }[] = [
  { id: 'biography',   label: 'Biography' },
  { id: 'filmography', label: 'Filmography' },
  { id: 'discussion',  label: 'Discussion' },
  { id: 'fans',        label: 'Fans' },
];
```

Update the `useState` line:

```ts
  const [tab, setTab] = useState<TabId>('biography');
```

- [ ] **Step 2: Add the new query hooks and dedupe helpers**

Below the existing `bioQuery` and `fansQuery` lines, add:

```ts
  const filmQuery       = useCelebrityFilmography(celebrity.id);
  const forumId         = bioQuery.data?.forumId ?? null;
  const discussionQuery = useCelebrityDiscussion(forumId);

  const movies = useMemo(() => {
    const seen = new Set<number>();
    const list: Movie[] = [];
    for (const page of filmQuery.data?.pages ?? []) {
      for (const m of page.movies) {
        if (!seen.has(m.titleId)) {
          seen.add(m.titleId);
          list.push(m);
        }
      }
    }
    return list;
  }, [filmQuery.data]);

  const topics = useMemo(() => {
    const seen = new Set<number>();
    const list: ForumTopic[] = [];
    for (const page of discussionQuery.data?.pages ?? []) {
      for (const t of page.topics) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          list.push(t);
        }
      }
    }
    return list;
  }, [discussionQuery.data]);
```

- [ ] **Step 3: Replace the tab body switch**

Replace the existing `{tab === 'biography' ? (...) : (...)}` block with a four-way conditional:

```tsx
        {tab === 'biography' ? (
          <BiographyTab
            biography={bioQuery.data}
            isLoading={bioQuery.isLoading}
            isError={bioQuery.isError}
            onRetry={() => bioQuery.refetch()}
          />
        ) : tab === 'filmography' ? (
          <FilmographyTab
            movies={movies}
            isLoading={filmQuery.isLoading}
            isError={filmQuery.isError}
            hasNextPage={!!filmQuery.hasNextPage}
            isFetchingNextPage={filmQuery.isFetchingNextPage}
            onLoadMore={() => filmQuery.fetchNextPage()}
            onRetry={() => filmQuery.refetch()}
          />
        ) : tab === 'discussion' ? (
          <DiscussionTab
            forumId={forumId}
            bioLoading={bioQuery.isLoading}
            topics={topics}
            isLoading={discussionQuery.isLoading}
            isError={discussionQuery.isError}
            hasNextPage={!!discussionQuery.hasNextPage}
            isFetchingNextPage={discussionQuery.isFetchingNextPage}
            onLoadMore={() => discussionQuery.fetchNextPage()}
            onRetry={() => discussionQuery.refetch()}
          />
        ) : (
          <FansTab
            fans={fans}
            isLoading={fansQuery.isLoading}
            isError={fansQuery.isError}
            hasNextPage={!!fansQuery.hasNextPage}
            isFetchingNextPage={fansQuery.isFetchingNextPage}
            onLoadMore={() => fansQuery.fetchNextPage()}
            onRetry={() => fansQuery.refetch()}
          />
        )}
```

- [ ] **Step 4: Loosen the active-tab indicator width if needed**

The existing `tabIndicator` style has `width: 60`. With four tabs, the cell width drops, but 60px is still smaller than a tab cell at typical phone widths so the indicator stays centered. No change needed unless visual testing shows overflow.

- [ ] **Step 5: Type-check**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 6: Visual smoke test**

Open the app, navigate to a celebrity with rich data (e.g., personId `3` Salman Khan):
- Tab strip shows 4 labels: **Biography · Filmography · Discussion · Fans**.
- Active indicator moves under the selected tab.
- Filmography lists movies, scrolls, "Load more" works.
- Tapping a filmography row pushes `MovieDetail`.
- Discussion lists topics, "Load more" works.
- Tapping a discussion row pushes `TopicDetail`.
- Discussion shows the empty-forum state for celebrities with no `forumId` (try a less-prominent celebrity if needed).
- Fans tab still works as before.

- [ ] **Step 7: Commit (ask user first)**

```bash
git add mobile/src/features/celebrities/screens/CelebrityDetailScreen.tsx
git commit -m "feat(mobile): wire Filmography and Discussion tabs into celebrity detail"
```

---

## Task 12: Final lint + tsc sweep

- [ ] **Step 1: Run lint**

Run: `cd mobile && npm run lint`
Expected: zero new warnings related to celebrities feature files.

- [ ] **Step 2: Run tsc**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 3: Final smoke test**

Re-test all 4 tabs on at least two celebrities (one with a forum, one without). Confirm:
- Biography tab still renders all existing sections plus the new physical fields and age.
- Filmography tab loads, paginates, navigates.
- Discussion tab loads or shows clean empty state, paginates, navigates.
- Fans tab unchanged.
- Theme toggle (light/dark) works on every new card.

- [ ] **Step 4: No commit needed if no fixes were made.**

If lint or tsc surfaced fixes, stage just the touched files and commit:

```bash
git add <touched-files>
git commit -m "chore(mobile): final lint/tsc cleanup for celebrity profile tier 1"
```

---

## Self-review (post-write)

**Spec coverage:**
- Tab restructure → Task 11 ✓
- Extended bio fields (chest/waist/biceps/eye/hair) → Tasks 1, 3 ✓
- Age computation → Tasks 2, 3 ✓
- `forumId` on `CelebrityBiography` → Task 1 ✓
- Filmography API + hook + UI → Tasks 4, 5, 6, 7 ✓
- Discussion API (reused) + hook + UI → Tasks 8, 9, 10 ✓
- Empty-state for celebrities with no forum → Task 10 ✓
- Tap-through to `MovieDetail` and `TopicDetail` → Tasks 6, 9 ✓
- No mock fallback in `fetchCelebrityFilmography` → Task 4 ✓

**Placeholder scan:** No "TBD"/"TODO"/"similar to Task N"/missing code blocks. Every step shows the exact code or command.

**Type consistency:**
- `CelebrityBiography.forumId: number` (Task 1) → consumed by `useCelebrityDiscussion(forumId: number | null)` (Task 8) and `DiscussionTab.forumId: number | null` (Task 10). The screen reads `bioQuery.data?.forumId ?? null` (Task 11). Consistent.
- `Movie` shape comes straight from `MoviesPage.movies` and is forwarded to `MovieDetail` route which already takes `{ movie: Movie }`. Consistent.
- `ForumTopic` from `ForumTopicsPage.topics` forwarded to `TopicDetail` (existing `HomeStack` route param uses the same shape). Consistent.
