# Home Web Stories Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead static `WebStoriesStrip` on Home with a live, navigable Web Stories rail (9:16 cover-only tiles, title overlaid on the cover) backed by the real `/webstories` API and the existing `WebStoryPlayerScreen`.

**Architecture:** A new `WebStoriesHomeSection` reads `useWebStories()`, slices to 10 stories, and renders a horizontal `ScrollView` of a new `WebStoryHomeTile` component (cover image with `LinearGradient` fallback, progress dots, title + time overlay). The orphaned `WebStoriesStrip.tsx` and `data/webStories.ts` files are deleted. `HomeScreen.tsx` swaps the import, drops the static seed, and adds `['webstories']` to pull-to-refresh.

**Tech Stack:** React Native (Expo 55) · TypeScript · React Query · React Navigation · `expo-image` · `expo-linear-gradient` · `@expo/vector-icons`. Verification via `npm run tsc` + Expo Metro visual check.

**Spec:** [`docs/superpowers/specs/2026-05-08-home-webstories-section-design.md`](../specs/2026-05-08-home-webstories-section-design.md)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `mobile/src/features/home/components/WebStoryHomeTile.tsx` | new | One 9:16 cover-only tile: cover image (or gradient fallback), progress dots, title overlay, time pill |
| `mobile/src/features/home/components/WebStoriesHomeSection.tsx` | new | Section header + horizontal `ScrollView` of `WebStoryHomeTile`s + skeleton row + empty/error guard + navigation wiring |
| `mobile/src/features/home/components/WebStoriesStrip.tsx` | **delete** | Dead static-data strip (replaced) |
| `mobile/src/features/home/data/webStories.ts` | **delete** | Dead static seed (no remaining consumers after this PR) |
| `mobile/src/features/home/screens/HomeScreen.tsx` | modify | Swap import, drop `WEB_STORIES` + `PREVIEW_WEB_STORIES`, render `<WebStoriesHomeSection />`, add `['webstories']` to refresh invalidation |

---

### Task 1: Create `WebStoryHomeTile.tsx`

**Files:**
- Create: `mobile/src/features/home/components/WebStoryHomeTile.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { memo, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { WebStorySummary } from '../../../services/api';

interface Props {
  story: WebStorySummary;
  onPress: (story: WebStorySummary) => void;
}

const FALLBACK_COLORS: [string, string] = ['#3558F0', '#7C3AED'];

function angleToStartEnd(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  return {
    start: { x: 0.5 - x / 2, y: 0.5 - y / 2 },
    end: { x: 0.5 + x / 2, y: 0.5 + y / 2 },
  };
}

function WebStoryHomeTileImpl({ story, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = !!story.coverImage && !imgFailed;
  const fallback = story.coverBg ?? { colors: FALLBACK_COLORS, angle: 160 };
  const { start, end } = angleToStartEnd(fallback.angle);

  return (
    <Pressable
      onPress={() => onPress(story)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Play web story: ${story.title}`}
    >
      <View style={styles.cover}>
        {showImage ? (
          <Image
            source={{ uri: story.coverImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={140}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <LinearGradient
            colors={fallback.colors}
            start={start}
            end={end}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Top scrim — keeps progress dots legible on bright covers */}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topScrim}
          pointerEvents="none"
        />

        {/* 5 progress dots */}
        <View style={styles.dots} pointerEvents="none">
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>

        {/* Bottom scrim — anchors title + time pill */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.78)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomScrim}
          pointerEvents="none"
        />

        <View style={styles.captionWrap} pointerEvents="none">
          <Text style={styles.title} numberOfLines={2}>
            {story.title}
          </Text>
          {story.timeAgo ? (
            <View style={styles.timePill}>
              <Text style={styles.timeText}>{story.timeAgo}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default memo(WebStoryHomeTileImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      width: 118,
      borderRadius: 14,
      backgroundColor: c.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.985 }],
    },
    cover: {
      width: '100%',
      aspectRatio: 9 / 16,
      backgroundColor: '#0B0B0B',
    },
    topScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 60,
    },
    dots: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      flexDirection: 'row',
      gap: 3,
    },
    dot: {
      flex: 1,
      maxWidth: 22,
      height: 2.5,
      borderRadius: 1.5,
      backgroundColor: 'rgba(255,255,255,0.65)',
    },
    bottomScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '55%',
    },
    captionWrap: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 8,
      gap: 6,
    },
    title: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.2,
      lineHeight: 15,
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    timePill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    timeText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
  });
}
```

> **Why duplicate `angleToStartEnd` instead of extracting it?** The same helper exists in `features/webstories/components/WebStoryCard.tsx`. Two call sites total — extracting to a shared module would cost a new file and a new import for one tiny pure function. If a third caller appears later, extract then.

> **Why `width: 118` (fixed) instead of `flex: 1`?** Tiles live in a horizontal `ScrollView`, not a flex grid. They need an explicit width so the scroller has measurable content. 118 × 16/9 ≈ 210 height — comfortable on standard phone widths without dwarfing the rest of Home.

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS (no errors).

- [ ] **Step 3: Commit (only after user authorizes)**

> Per memory rule, do NOT run `git commit` until the user explicitly authorizes it.

```bash
git add mobile/src/features/home/components/WebStoryHomeTile.tsx
git commit -m "feat(mobile): add WebStoryHomeTile (live-site style cover-only)"
```

---

### Task 2: Create `WebStoriesHomeSection.tsx`

**Files:**
- Create: `mobile/src/features/home/components/WebStoriesHomeSection.tsx`

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
import type { WebStorySummary } from '../../../services/api';
import { useWebStories } from '../../webstories/hooks/useWebStories';
import WebStoryHomeTile from './WebStoryHomeTile';

const PREVIEW_COUNT = 10;
const SKELETON_COUNT = 5;

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function WebStoriesHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, isError } = useWebStories();

  const previewStories = useMemo<WebStorySummary[]>(
    () => (data?.pages?.[0]?.stories ?? []).slice(0, PREVIEW_COUNT),
    [data],
  );

  const handleStoryPress = useCallback(
    (story: WebStorySummary) => {
      const index = previewStories.findIndex((s) => s.id === story.id);
      if (index < 0) return;
      navigation.navigate('WebStoryPlayer', {
        stories: previewStories,
        index,
      });
    },
    [navigation, previewStories],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('WebStories'),
    [navigation],
  );

  if (isError && !previewStories.length) return null;
  if (!isLoading && !previewStories.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>WEB STORIES</Text>
            <Text style={styles.subtitle}>Tap to play · auto-advances</Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [
            styles.seeAll,
            pressed && styles.seeAllPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="See all web stories"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading && !previewStories.length ? (
        <View style={styles.skeletonRow}>
          {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
            <View key={`sk-${idx}`} style={styles.skeletonTile} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {previewStories.map((story) => (
            <WebStoryHomeTile
              key={story.id}
              story={story}
              onPress={handleStoryPress}
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
      gap: 10,
      flexDirection: 'row',
    },
    skeletonRow: {
      paddingHorizontal: 14,
      gap: 10,
      flexDirection: 'row',
    },
    skeletonTile: {
      width: 118,
      aspectRatio: 9 / 16,
      borderRadius: 14,
      backgroundColor: c.surface,
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS.

- [ ] **Step 3: Commit (only after user authorizes)**

```bash
git add mobile/src/features/home/components/WebStoriesHomeSection.tsx
git commit -m "feat(mobile): add WebStoriesHomeSection (live data, navigable)"
```

---

### Task 3: Wire `WebStoriesHomeSection` into `HomeScreen` and remove dead files

**Files:**
- Modify: `mobile/src/features/home/screens/HomeScreen.tsx`
- Delete: `mobile/src/features/home/components/WebStoriesStrip.tsx`
- Delete: `mobile/src/features/home/data/webStories.ts`

- [ ] **Step 1: Swap the strip import for the new section**

In `HomeScreen.tsx`, replace this exact line:

```tsx
import WebStoriesStrip from '../components/WebStoriesStrip';
```

with:

```tsx
import WebStoriesHomeSection from '../components/WebStoriesHomeSection';
```

- [ ] **Step 2: Drop the static-data import**

Remove this exact line from `HomeScreen.tsx`:

```tsx
import { WEB_STORIES } from '../data/webStories';
```

- [ ] **Step 3: Drop the `PREVIEW_WEB_STORIES` constant**

Remove this exact line:

```tsx
const PREVIEW_WEB_STORIES = WEB_STORIES.slice(0, 8);
```

- [ ] **Step 4: Replace the strip render with the new section**

Find this block in the `ListFooter` `useMemo`:

```tsx
        <View style={styles.sectionGap}>
          <WebStoriesStrip stories={PREVIEW_WEB_STORIES} onSeeAll={() => {}} />
        </View>
```

Replace it with:

```tsx
        <View style={styles.sectionGap}>
          <WebStoriesHomeSection />
        </View>
```

- [ ] **Step 5: Add `['webstories']` to pull-to-refresh invalidation**

Find the existing `Promise.all` block in `handleRefresh`:

```tsx
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['banners'] }),
        queryClient.invalidateQueries({ queryKey: ['articles'] }),
        queryClient.invalidateQueries({ queryKey: ['home-forum-topics'] }),
        queryClient.invalidateQueries({ queryKey: ['home-media-galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
        queryClient.invalidateQueries({ queryKey: ['quizzes'] }),
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
      ]);
```

- [ ] **Step 6: Delete the dead strip file**

Delete `mobile/src/features/home/components/WebStoriesStrip.tsx`.

Run from the repo root:

```bash
rm "mobile/src/features/home/components/WebStoriesStrip.tsx"
```

> If on Windows PowerShell, equivalent: `Remove-Item "mobile\src\features\home\components\WebStoriesStrip.tsx"`.

- [ ] **Step 7: Delete the static seed file**

Delete `mobile/src/features/home/data/webStories.ts`.

```bash
rm "mobile/src/features/home/data/webStories.ts"
```

> Windows PowerShell: `Remove-Item "mobile\src\features\home\data\webStories.ts"`.

- [ ] **Step 8: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS. (If `tsc` complains about a stale reference to `WEB_STORIES` or `WebStoriesStrip`, you missed one of steps 1-4 — go back and double-check `HomeScreen.tsx`.)

- [ ] **Step 9: Visual verification — Home tab**

Run: `cd mobile; npm run start`

Open the app on a device/emulator and verify on the Home tab:

1. Scroll to the very bottom of the Home content (past Trending Now, Latest News, Forums, Photo Galleries, Popular Indian TV Shows, VIDEOS, FAN QUIZZES).
2. The new **WEB STORIES** section appears as the last content section before the bottom spacer. Header: red accent bar + "WEB STORIES" + subtitle "Tap to play · auto-advances" + right-aligned `See All ›`.
3. Below the header, a horizontally scrolling row of 9:16 portrait tiles. Each tile shows:
   - Real cover image (with gradient fallback when the API returns a story with no thumbnail or the image URL fails to load).
   - 5 progress-dot bars at the top.
   - Title overlaid on a bottom scrim (max 2 lines).
   - A tiny black-pill time indicator below the title (`2d`, `4h`, `1w`, etc.) — only visible when `timeAgo` is non-empty.
4. Swipe horizontally → row scrolls smoothly.
5. Tap any tile → opens `WebStoryPlayer` at that index. Auto-advance plays through. Use the player's next-story affordance and confirm it walks through the same set you saw on Home (preview slice, not the full paginated list).
6. Back from player → returns to Home with scroll position preserved.
7. Tap `See All` → opens the `WebStories` grid screen.
8. Pull to refresh on Home → the strip's tiles refresh (new server data appears if upstream changed).
9. Toggle dark mode → header text/accent/subtitle/See All adapt to the theme. Cover overlays (scrims, dots, title color, time pill) stay white-on-dark by design.
10. If the API returns zero stories, the section is hidden entirely (no broken empty state visible).

- [ ] **Step 10: Commit (only after user authorizes)**

```bash
git add mobile/src/features/home/screens/HomeScreen.tsx
git rm mobile/src/features/home/components/WebStoriesStrip.tsx mobile/src/features/home/data/webStories.ts
git commit -m "feat(mobile): switch Home Web Stories rail to live data + nav"
```

> The deleted files were already removed in steps 6-7; `git rm` here just stages the deletions.

---

## Self-review

- **Spec coverage:**
  - 9:16 cover-only tiles with title overlay → Task 1 (`WebStoryHomeTile`). ✓
  - Real `coverImage` with `LinearGradient` fallback from `coverBg` → Task 1 (`showImage`, `fallback` logic, `onError` handler). ✓
  - 5 progress dots top + top scrim + bottom scrim + time pill → Task 1 styles. ✓
  - Section header (accent bar + uppercase title + subtitle + `See All ›`) → Task 2 header. ✓
  - `useWebStories()` data, slice to 10 → Task 2 `previewStories`. ✓
  - Skeleton row of 5 placeholder tiles → Task 2 conditional. ✓
  - Hide on error/empty → Task 2 guards. ✓
  - Tile tap → `WebStoryPlayer` with `{ stories: previewStories, index }` → Task 2 `handleStoryPress`. ✓
  - See All → `WebStories` → Task 2 `handleSeeAll`. ✓
  - Insertion in `HomeScreen` after Quizzes, before spacer → Task 3 step 4 (replaces existing call site, which is already in that position). ✓
  - `['webstories']` in pull-to-refresh → Task 3 step 5. ✓
  - Delete `WebStoriesStrip.tsx` and `data/webStories.ts` → Task 3 steps 6-7. ✓
  - Theming via `makeStyles(colors)` → Tasks 1 & 2. ✓
- **Placeholder scan:** No "TBD"/"TODO"/"Similar to Task N" left. Every step ships full code or an exact command.
- **Type consistency:**
  - `WebStorySummary` imported from `../../../services/api` in both new files.
  - `useWebStories` returns `useInfiniteQuery<WebStoriesPage>` per its definition; `data?.pages?.[0]?.stories` matches `WebStoriesPage.stories: WebStorySummary[]`.
  - `HomeStackParamList.WebStoryPlayer: { stories: WebStorySummary[]; index: number }` is satisfied by `{ stories: previewStories, index }`.
  - `HomeStackParamList.WebStories: undefined` is satisfied by `navigation.navigate('WebStories')`.
  - `coverBg: GradientFill | null` is handled with the `?? FALLBACK_COLORS` fallback.

---

## Out of scope (explicitly not in this plan)

- Modifying any file under `mobile/src/features/webstories/` (the existing player, grid screen, hooks, or detail components).
- Adding new query keys, transformers, or API endpoints.
- Story-bookmarking / read-tracking / "new since last visit" highlighting.
- Auto-advance preview animations on the home tiles.
- Per-category or featured-first filtering on the home rail.
- Unit tests (this codebase has no test pattern committed yet).
