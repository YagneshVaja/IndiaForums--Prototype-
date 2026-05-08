# Home Celebrity Ranking Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Celebrity Ranking preview rail (avatar tiles with rank medals + inline category chips) to the Home tab between Latest Movies and the bottom spacer.

**Architecture:** A new `CelebrityRankingHomeSection` reads `useCelebritiesRanking()` (already in place), holds local state for active vertical (`bollywood | television | creators`), and renders a horizontal `ScrollView` of a new `CelebrityRankTile` component. Tile reuses the existing `TrendBadge` and `Initials` components from `features/celebrities/`. Tap → existing `CelebrityProfile` route; See All → existing `Celebrities` route.

**Tech Stack:** React Native (Expo 55) · TypeScript · React Query · React Navigation · `expo-image` · `@expo/vector-icons`. Verification via `npm run tsc` + Expo Metro visual check.

**Spec:** [`docs/superpowers/specs/2026-05-08-home-celebrity-ranking-section-design.md`](../specs/2026-05-08-home-celebrity-ranking-section-design.md)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `mobile/src/features/home/components/CelebrityRankTile.tsx` | new | One avatar tile: 80px circular thumb (with `Initials` fallback), rank medal pill (gold/silver/bronze for top 3, theme pill for 4+), `TrendBadge`, name (≤ 2 lines), role |
| `mobile/src/features/home/components/CelebrityRankingHomeSection.tsx` | new | Section header + week subtitle + 3-chip segmented control + horizontal `ScrollView` of `CelebrityRankTile`s + skeleton row + empty/error guard + navigation wiring |
| `mobile/src/features/home/screens/HomeScreen.tsx` | modify | Render `<CelebrityRankingHomeSection />` between `<LatestMoviesHomeSection />` and the trailing spacer; add `['celebrities']` to refresh invalidation |

No new types, hooks, APIs, or routes.

---

### Task 1: Create `CelebrityRankTile.tsx`

**Files:**
- Create: `mobile/src/features/home/components/CelebrityRankTile.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { memo, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Celebrity } from '../../../services/api';
import TrendBadge from '../../celebrities/components/TrendBadge';
import Initials from '../../celebrities/components/Initials';

interface Props {
  celeb: Celebrity;
  onPress: (celeb: Celebrity) => void;
}

const AVATAR_SIZE = 80;

// Olympic palette — same triplet used by features/home/components/ChannelsSection.tsx
const MEDAL_BG: Record<1 | 2 | 3, string> = {
  1: '#F5C518',
  2: '#C0C0C0',
  3: '#CD7F32',
};
const MEDAL_EMOJI: Record<1 | 2 | 3, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function CelebrityRankTileImpl({ celeb, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = !!celeb.thumbnail && !imgFailed;
  const isPodium = celeb.rank >= 1 && celeb.rank <= 3;
  const medalKey = (isPodium ? celeb.rank : 0) as 1 | 2 | 3;

  return (
    <Pressable
      onPress={() => onPress(celeb)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${celeb.name}, rank ${celeb.rank}`}
    >
      <View style={styles.avatarWrap}>
        {showImage ? (
          <Image
            source={{ uri: celeb.thumbnail as string }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Initials name={celeb.name} size={AVATAR_SIZE} />
        )}

        {isPodium ? (
          <View
            style={[
              styles.medal,
              styles.medalPodium,
              { backgroundColor: MEDAL_BG[medalKey] },
            ]}
          >
            <Text style={styles.medalText}>
              {MEDAL_EMOJI[medalKey]} #{celeb.rank}
            </Text>
          </View>
        ) : (
          <View style={[styles.medal, styles.medalPlain]}>
            <Text style={styles.medalPlainText}>#{celeb.rank}</Text>
          </View>
        )}
      </View>

      <View style={styles.trendWrap}>
        <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} compact />
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {celeb.name}
      </Text>
      {celeb.shortDesc ? (
        <Text style={styles.role} numberOfLines={1}>
          {celeb.shortDesc}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default memo(CelebrityRankTileImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      width: 88,
      alignItems: 'center',
    },
    pressed: { opacity: 0.78 },

    avatarWrap: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      position: 'relative',
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: c.surface,
    },

    medal: {
      position: 'absolute',
      bottom: -4,
      right: -2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.card,
    },
    medalPodium: {
      // backgroundColor injected per-tile from MEDAL_BG
    },
    medalText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#1A1A1A',
      letterSpacing: 0.2,
    },
    medalPlain: {
      backgroundColor: c.surface,
    },
    medalPlainText: {
      fontSize: 10,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 0.2,
    },

    trendWrap: {
      marginTop: 8,
    },
    name: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      lineHeight: 15,
      textAlign: 'center',
    },
    role: {
      marginTop: 1,
      fontSize: 10.5,
      color: c.textTertiary,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
}
```

> **Why a fixed `width: 88`?** Tiles live in a horizontal `ScrollView`; flex measurements collapse without an explicit width. 88px gives the 80px avatar a small symmetric horizontal margin and lets the name use up to 2 lines without crowding neighbours.

> **Why the medal sits at `bottom: -4, right: -2`?** Lets the medal pill nudge slightly outside the avatar circle — a common app convention (Hotstar / Inshorts use this) that visually anchors the rank without obscuring the face.

> **Why `MEDAL_EMOJI`/`MEDAL_BG` keyed on `1 | 2 | 3` (not by rank directly)?** Narrowing the keys to a literal union lets TypeScript catch any future mistake of indexing with a non-podium rank. The runtime guard `isPodium` makes the cast safe.

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS (no errors).

- [ ] **Step 3: Commit (only after user authorizes)**

> Per memory rule, do NOT run `git commit` until the user explicitly authorizes it.

```bash
git add mobile/src/features/home/components/CelebrityRankTile.tsx
git commit -m "feat(mobile): add CelebrityRankTile (avatar + rank medal home tile)"
```

---

### Task 2: Create `CelebrityRankingHomeSection.tsx`

**Files:**
- Create: `mobile/src/features/home/components/CelebrityRankingHomeSection.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Celebrity } from '../../../services/api';
import { useCelebritiesRanking } from '../../celebrities/hooks/useCelebritiesRanking';
import { formatRankRange } from '../../celebrities/utils/formatDate';
import CelebrityRankTile from './CelebrityRankTile';

const PREVIEW_COUNT = 10;
const SKELETON_COUNT = 5;

type HomeCategoryId = 'bollywood' | 'television' | 'creators';

const HOME_CATEGORY_TABS: { id: HomeCategoryId; label: string }[] = [
  { id: 'bollywood', label: 'Bollywood' },
  { id: 'television', label: 'Television' },
  { id: 'creators', label: 'Creators' },
];

const HOME_CATEGORY_FALLBACK_LABEL: Record<HomeCategoryId, string> = {
  bollywood: 'Bollywood',
  television: 'Television',
  creators: 'Creators',
};

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function CelebrityRankingHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const [activeCat, setActiveCat] = useState<HomeCategoryId>('bollywood');
  const { data, isLoading, isError } = useCelebritiesRanking();

  const activeList = useMemo<Celebrity[]>(
    () => data?.categories[activeCat] ?? [],
    [data, activeCat],
  );
  const previewCelebs = useMemo<Celebrity[]>(
    () => activeList.slice(0, PREVIEW_COUNT),
    [activeList],
  );

  const totalAcrossCategories = useMemo(() => {
    if (!data) return 0;
    return (
      data.categories.bollywood.length +
      data.categories.television.length +
      data.categories.creators.length
    );
  }, [data]);

  const weekLabel = useMemo(
    () =>
      data ? formatRankRange(data.rankStartDate, data.rankEndDate) : '',
    [data],
  );

  const handleCelebPress = useCallback(
    (celebrity: Celebrity) =>
      navigation.navigate('CelebrityProfile', { celebrity }),
    [navigation],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('Celebrities'),
    [navigation],
  );

  // Hide entirely on hard error or when every category is empty.
  if (isError && !totalAcrossCategories) return null;
  if (!isLoading && !totalAcrossCategories) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>CELEBRITY RANKING</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {weekLabel ? `This week · ${weekLabel}` : 'This week'}
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
          accessibilityLabel="See full celebrity ranking"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.segment}>
        {HOME_CATEGORY_TABS.map((tab) => {
          const active = tab.id === activeCat;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveCat(tab.id)}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${tab.label} ranking`}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  active && styles.segmentLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading && !totalAcrossCategories ? (
        <View style={styles.skeletonRow}>
          {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
            <View key={`sk-${idx}`} style={styles.skeletonCell}>
              <View style={[styles.skeleton, styles.skeletonAvatar]} />
              <View style={[styles.skeleton, styles.skeletonLine]} />
              <View style={[styles.skeleton, styles.skeletonLineShort]} />
            </View>
          ))}
        </View>
      ) : previewCelebs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No ranking for {HOME_CATEGORY_FALLBACK_LABEL[activeCat]} this week
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {previewCelebs.map((celeb) => (
            <CelebrityRankTile
              key={celeb.id}
              celeb={celeb}
              onPress={handleCelebPress}
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
      paddingBottom: 12,
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

    segment: {
      flexDirection: 'row',
      marginHorizontal: 14,
      marginBottom: 14,
      borderRadius: 10,
      backgroundColor: c.surface,
      padding: 3,
      gap: 3,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: c.primary,
    },
    segmentLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.2,
    },
    segmentLabelActive: {
      color: '#FFFFFF',
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
      width: 88,
      alignItems: 'center',
    },
    skeleton: {
      backgroundColor: c.surface,
      borderRadius: 6,
    },
    skeletonAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    skeletonLine: {
      height: 11,
      width: '90%',
      marginTop: 10,
    },
    skeletonLineShort: {
      height: 9,
      width: '60%',
      marginTop: 6,
    },

    emptyWrap: {
      paddingHorizontal: 14,
      paddingVertical: 18,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textTertiary,
    },
  });
}
```

> **Why redeclare `HOME_CATEGORY_TABS` instead of importing `CELEB_CATEGORY_TABS`?** The shared constant in `features/celebrities/utils/constants.ts` includes an `'all'` tab keyed against the full `CelebCategoryId` union. The Home rail intentionally restricts to the three pre-bucketed verticals (see spec). Building a 3-only list locally keeps the typing tight (`HomeCategoryId` is a strict subset) and avoids leaking an `'all'` chip into Home that the layout doesn't support.

> **Why hide on `!totalAcrossCategories` rather than just `!previewCelebs.length`?** `previewCelebs.length === 0` is also true on Home when the *active* category is empty but other categories have data — in that case we want to keep the section visible with an empty-state line so the user can switch chips. The hide guard fires only when every category is empty (genuine no-data state).

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS.

- [ ] **Step 3: Commit (only after user authorizes)**

```bash
git add mobile/src/features/home/components/CelebrityRankingHomeSection.tsx
git commit -m "feat(mobile): add CelebrityRankingHomeSection (rail + chips)"
```

---

### Task 3: Wire `CelebrityRankingHomeSection` into `HomeScreen`

**Files:**
- Modify: `mobile/src/features/home/screens/HomeScreen.tsx`

- [ ] **Step 1: Add the import**

In `HomeScreen.tsx`, immediately after the existing line:

```tsx
import LatestMoviesHomeSection from '../components/LatestMoviesHomeSection';
```

…add:

```tsx
import CelebrityRankingHomeSection from '../components/CelebrityRankingHomeSection';
```

- [ ] **Step 2: Add `['celebrities']` to pull-to-refresh invalidation**

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
        queryClient.invalidateQueries({ queryKey: ['movies'] }),
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
        queryClient.invalidateQueries({ queryKey: ['celebrities'] }),
      ]);
```

The `useCelebritiesRanking` hook keys as `['celebrities', 'ranking']`. Invalidating the `['celebrities']` prefix covers it (and any future celeb sub-keys).

- [ ] **Step 3: Render the section in `ListFooter`**

Locate the existing block in the `ListFooter` `useMemo`:

```tsx
        <View style={styles.sectionGap}>
          <LatestMoviesHomeSection />
        </View>

        <View style={styles.spacer} />
```

Insert a new section block between them:

```tsx
        <View style={styles.sectionGap}>
          <LatestMoviesHomeSection />
        </View>

        <View style={styles.sectionGap}>
          <CelebrityRankingHomeSection />
        </View>

        <View style={styles.spacer} />
```

No dependency change is needed for the `ListFooter` `useMemo` — `CelebrityRankingHomeSection` is parameterless and self-contained.

- [ ] **Step 4: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS.

- [ ] **Step 5: Visual verification — Home tab**

Run: `cd mobile; npm run start`

Open the app on a device/emulator and verify on the Home tab:

1. Scroll to the very bottom of Home (past Trending Now, Latest News, Forums, Photo Galleries, Popular Indian TV Shows, VIDEOS, FAN QUIZZES, WEB STORIES, LATEST MOVIES).
2. The new **CELEBRITY RANKING** section appears as the last content section, just before the bottom spacer. Header: red accent bar + "CELEBRITY RANKING" + subtitle starting with "This week" + the formatted week range, plus a right-aligned `See All ›`.
3. Below the header, a 3-chip segmented control: `Bollywood` / `Television` / `Creators`. The active chip uses the brand primary background with white text; the others use the surface background with secondary text.
4. Below the chips, a horizontally scrolling row of avatar tiles. Each tile shows:
   - 80px circular avatar (real `thumbnail` via `expo-image`, or an `Initials` fallback when missing / failed).
   - Rank medal pill at the avatar's bottom-right:
     - `🥇 #1` on gold, `🥈 #2` on silver, `🥉 #3` on bronze for the top 3.
     - Plain `#N` pill on `c.surface` for ranks 4+.
   - Compact `TrendBadge` (▲ +N green / ▼ -N red / — neutral) just below.
   - 2-line name, then 1-line role (`shortDesc`) when present.
5. Tap any tile → opens `CelebrityProfile` with the matching celebrity. Back returns to Home with scroll position preserved.
6. Tap each chip → the rail re-renders with that vertical's top 10 (no spinner / no refetch — pure local switch).
7. If a chosen vertical has zero entries this week, the rail area shows a centered muted line: `"No ranking for {Vertical} this week"`. The user can tap another chip to leave the empty state.
8. Tap `See All` → opens the `Celebrities` screen.
9. Pull to refresh on Home → the rail's tiles refresh (new server data appears if upstream changed).
10. Toggle dark mode (via Side Menu / theme toggle) → header text/accent/subtitle/See All/segment background/inactive chip text all adapt to the theme; gold/silver/bronze medals stay fixed (intentional).
11. If the API errors out and there's no cached data, the section is hidden entirely (no broken empty section).

- [ ] **Step 6: Commit (only after user authorizes)**

```bash
git add mobile/src/features/home/screens/HomeScreen.tsx
git commit -m "feat(mobile): show Celebrity Ranking section on Home after Movies"
```

---

## Self-review

- **Spec coverage:**
  - 88-px tile, 80-px circular avatar with `Initials` fallback → Task 1 (`CelebrityRankTile`). ✓
  - Gold/silver/bronze medals on top 3, plain `#N` pill on 4+ → Task 1 (`isPodium`, `medalPodium` vs `medalPlain`). ✓
  - Compact `TrendBadge` beneath avatar → Task 1 (`<TrendBadge … compact />`). ✓
  - Header style mirrors sibling sections → Task 2 header styles. ✓
  - Subtitle uses `formatRankRange` → Task 2 `weekLabel`. ✓
  - 3-chip segmented control (Bollywood / Television / Creators) excluding `'all'` → Task 2 `HOME_CATEGORY_TABS` + `HomeCategoryId` subtype. ✓
  - Switching chips re-renders without refetch → Task 2 (the active list is sliced from already-cached `data.categories[activeCat]`). ✓
  - Hide on hard error or all-empty; show empty-state line for single-category empty → Task 2 guards (`totalAcrossCategories` for hide; per-category `previewCelebs.length === 0` for inline empty). ✓
  - Tap → `CelebrityProfile`, See All → `Celebrities` → Task 2 `handleCelebPress`/`handleSeeAll`. ✓
  - Skeleton row of 5 placeholder tiles → Task 2 conditional. ✓
  - Insertion in `HomeScreen` between `<LatestMoviesHomeSection />` and the spacer → Task 3 step 3. ✓
  - `['celebrities']` in pull-to-refresh → Task 3 step 2. ✓
  - Theming via `makeStyles(colors)` → Tasks 1 & 2. ✓
- **Placeholder scan:** No "TBD"/"TODO"/"Similar to Task N". Every step ships full code or an exact command.
- **Type consistency:**
  - `Celebrity` imported from `../../../services/api` in both new files; matches the type used by `useCelebritiesRanking` and `CelebrityProfile` route param.
  - `HomeStackParamList.CelebrityProfile: { celebrity: Celebrity }` is satisfied by `{ celebrity }`.
  - `HomeStackParamList.Celebrities: undefined` is satisfied by `navigation.navigate('Celebrities')`.
  - `useCelebritiesRanking` returns `useQuery<CelebritiesPayload>`; reading `data.categories.bollywood / .television / .creators` matches the payload shape.
  - `TrendBadge` props `{ trend, rankDiff, compact? }` are satisfied by `<TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} compact />`.
  - `Initials` props `{ name, size? }` are satisfied by `<Initials name={celeb.name} size={AVATAR_SIZE} />`.
  - `formatRankRange(start: string, end: string): string` accepts `data.rankStartDate` / `data.rankEndDate`, both typed `string` in `CelebritiesPayload`.

---

## Out of scope (explicitly not in this plan)

- Modifying any file under `mobile/src/features/celebrities/` (existing screens, hooks, components).
- Adding new query keys, transformers, or API endpoints.
- An `All` chip on Home (deferred to the dedicated Celebrities screen).
- Following / fan-it / share actions from Home tiles.
- Per-language or per-region filtering.
- Unit tests (this codebase has no test pattern committed yet).
