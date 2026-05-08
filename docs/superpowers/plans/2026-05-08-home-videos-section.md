# Home Videos Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 2×2 Videos preview grid to the Home tab between "Popular Indian TV Shows" and Web Stories.

**Architecture:** A new `VideosHomeSection` component reads the existing `useVideos(null)` query, picks 4 featured-first videos, and renders them in a 2×2 grid via a new `VideoGridTile` component. Tap → existing `VideoDetail` route; See All → existing `Videos` route.

**Tech Stack:** React Native (Expo 55) · TypeScript · React Query · React Navigation · `expo-image` · `@expo/vector-icons`. No test files committed in this repo, so verification is via `npm run tsc` + Expo Metro visual check (mobile/CLAUDE.md established pattern).

**Spec:** [`docs/superpowers/specs/2026-05-08-home-videos-section-design.md`](../specs/2026-05-08-home-videos-section-design.md)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `mobile/src/features/home/components/VideoGridTile.tsx` | new | One tile: thumbnail + play overlay + duration pill + LIVE badge + 2-line title + meta line |
| `mobile/src/features/home/components/VideosHomeSection.tsx` | new | Section header + 2×2 grid + loading skeleton + empty/error guard + navigation wiring |
| `mobile/src/features/home/screens/HomeScreen.tsx` | modify | Render `<VideosHomeSection />` between `ChannelsSection` and `WebStoriesStrip`; add `['videos']` to refresh invalidation list |

No new files for hooks, types, or APIs — all infra (`useVideos`, `Video` type, `VideoDetail`/`Videos` routes) already exists.

---

### Task 1: Create `VideoGridTile.tsx`

**Files:**
- Create: `mobile/src/features/home/components/VideoGridTile.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Video } from '../../../services/api';

interface Props {
  video: Video;
  onPress: (video: Video) => void;
}

function VideoGridTileImpl({ video, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const metaParts: string[] = [];
  if (video.views) metaParts.push(`${video.views} views`);
  if (video.timeAgo) metaParts.push(video.timeAgo);
  const meta = metaParts.join(' · ');

  return (
    <Pressable
      onPress={() => onPress(video)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Play video: ${video.title}`}
    >
      <View style={[styles.thumb, { backgroundColor: video.bg }]}>
        {video.thumbnail ? (
          <Image
            source={{ uri: video.thumbnail }}
            style={styles.img}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <Text style={styles.emoji}>{video.emoji}</Text>
        )}

        <View style={styles.scrim} />

        <View style={styles.playWrap}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={14} color="#FFFFFF" />
          </View>
        </View>

        {video.live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : null}

        {video.duration ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const VideoGridTile = React.memo(VideoGridTileImpl);
export default VideoGridTile;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    pressed: { opacity: 0.78 },
    thumb: {
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    img: { width: '100%', height: '100%' },
    emoji: { fontSize: 38 },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    playWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 2,
    },
    liveBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#E11D48',
    },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#FFFFFF',
    },
    liveText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    duration: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.75)',
    },
    durationText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    body: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 4,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      lineHeight: 17,
      letterSpacing: -0.1,
    },
    meta: {
      fontSize: 10.5,
      color: c.textTertiary,
      fontWeight: '500',
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/home/components/VideoGridTile.tsx
git commit -m "feat(mobile): add VideoGridTile for home video grid"
```

> **Note:** Do not run the commit until the user has explicitly authorized it (see user memory `feedback_always_ask_before_commit.md`). Stop here and ask before committing.

---

### Task 2: Create `VideosHomeSection.tsx`

**Files:**
- Create: `mobile/src/features/home/components/VideosHomeSection.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Video } from '../../../services/api';
import { useVideos } from '../../videos/hooks/useVideos';
import VideoGridTile from './VideoGridTile';

const PREVIEW_COUNT = 4;

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

function pickPreview(videos: Video[]): Video[] {
  const featured = videos.filter((v) => v.featured);
  const source = featured.length >= PREVIEW_COUNT ? featured : videos;
  return source.slice(0, PREVIEW_COUNT);
}

export default function VideosHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, isError } = useVideos(null);

  const allVideos = useMemo<Video[]>(
    () => (data?.pages ?? []).flatMap((p) => p.videos),
    [data],
  );
  const preview = useMemo(() => pickPreview(allVideos), [allVideos]);

  const handlePress = useCallback(
    (video: Video) => navigation.navigate('VideoDetail', { video }),
    [navigation],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('Videos'),
    [navigation],
  );

  if (isError && !preview.length) return null;
  if (!isLoading && !preview.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>VIDEOS</Text>
            <Text style={styles.subtitle}>Latest from across the platform</Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [styles.seeAll, pressed && styles.seeAllPressed]}
          accessibilityRole="button"
          accessibilityLabel="See all videos"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {isLoading && !preview.length
          ? Array.from({ length: PREVIEW_COUNT }).map((_, idx) => (
              <View key={`sk-${idx}`} style={styles.cell}>
                <View style={[styles.skeleton, styles.skeletonThumb]} />
                <View style={[styles.skeleton, styles.skeletonLine]} />
                <View style={[styles.skeleton, styles.skeletonLineShort]} />
              </View>
            ))
          : preview.map((video) => (
              <View key={video.id} style={styles.cell}>
                <VideoGridTile video={video} onPress={handlePress} />
              </View>
            ))}
      </View>
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

    grid: {
      paddingHorizontal: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    cell: {
      width: '48%',
    },

    skeleton: {
      backgroundColor: c.surface,
      borderRadius: 6,
    },
    skeletonThumb: {
      aspectRatio: 16 / 9,
      borderRadius: 12,
      marginBottom: 8,
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

> **Why `width: '48%'` instead of flexBasis math:** The parent `grid` uses `gap: 10` and `flexWrap: 'wrap'`, so two 48% children + 10px gap fits within 100%, and gap absorbs the remainder. This avoids hard-coding the parent's horizontal padding.

> **Skeleton uses `c.surface`:** Matches the `surface` token convention used by other skeleton-style placeholders in this repo. Don't introduce a new gray.

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/home/components/VideosHomeSection.tsx
git commit -m "feat(mobile): add VideosHomeSection 2x2 preview grid"
```

> **Note:** Do not commit until the user authorizes it.

---

### Task 3: Wire `VideosHomeSection` into `HomeScreen`

**Files:**
- Modify: `mobile/src/features/home/screens/HomeScreen.tsx`

- [ ] **Step 1: Add the import**

In `HomeScreen.tsx` after the existing component imports (around line 21, next to `ChannelsSection`):

```tsx
import VideosHomeSection from '../components/VideosHomeSection';
```

- [ ] **Step 2: Add `['videos']` to pull-to-refresh invalidation**

Find the existing block:

```tsx
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['banners'] }),
  queryClient.invalidateQueries({ queryKey: ['articles'] }),
  queryClient.invalidateQueries({ queryKey: ['home-forum-topics'] }),
  queryClient.invalidateQueries({ queryKey: ['home-media-galleries'] }),
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
]);
```

The `useVideos` hook keys as `['videos', contentId ?? 'all']`, so invalidating the prefix `['videos']` covers every category — exactly what we want on a global pull-to-refresh.

- [ ] **Step 3: Render the section in `ListFooter`**

In the `ListFooter` `useMemo`, locate:

```tsx
<View style={styles.sectionGap}>
  <ChannelsSection />
</View>

<View style={styles.sectionGap}>
  <WebStoriesStrip stories={PREVIEW_WEB_STORIES} onSeeAll={() => {}} />
</View>
```

Insert a new section block between them:

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

No dependency change is needed for the `ListFooter` `useMemo` — `VideosHomeSection` is parameterless and self-contained (it owns its own query, navigation, and state).

- [ ] **Step 4: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS.

- [ ] **Step 5: Visual verification — Home tab**

Run: `cd mobile; npm run start`

Open the app on a device/emulator and verify on the Home tab:

1. Scroll past Trending Now / Latest News / Forums / Photo Galleries / Popular Indian TV Shows.
2. The new **VIDEOS** section appears immediately after Popular Indian TV Shows and before Web Stories.
3. Header shows the red accent bar + "VIDEOS" + subtitle "Latest from across the platform" + right-aligned "See All ›" pressable.
4. Below the header, a 2×2 grid of 4 video tiles. Each tile has:
   - 16:9 thumbnail with a darker scrim overlay.
   - Centered translucent circular play button.
   - Duration pill in the bottom-right when the API returns one.
   - Red `LIVE` badge in the top-left when `video.live` is true (only verifiable if a current LIVE video is in the response).
   - Two-line title beneath, then `views · timeAgo` meta line.
5. Tap a tile → navigates to `VideoDetail`. Back returns to Home with scroll position preserved.
6. Tap "See All" → navigates to `Videos` screen. Back returns to Home.
7. Pull to refresh → spinner appears, releases, the grid stays populated (and content refreshes if the upstream changed).
8. Toggle dark mode (via Side Menu / theme toggle if available) → tile borders, title color, and meta color all adapt; play overlay / duration / LIVE badge keep their fixed colors (intended).

If the section is empty or errors silently (renders nothing), open the Videos tab/screen separately and confirm `useVideos` is returning data — the home section deliberately hides itself when there is no data to avoid showing a broken slot.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/features/home/screens/HomeScreen.tsx
git commit -m "feat(mobile): show Videos section on Home after Popular TV Shows"
```

> **Note:** Do not commit until the user authorizes it.

---

## Self-review

- **Spec coverage:**
  - 2×2 grid with 16:9 tiles → Task 1 (tile) + Task 2 (grid layout). ✓
  - Header (accent bar + uppercase title + subtitle + See All) → Task 2. ✓
  - Featured-first selection → `pickPreview` in Task 2. ✓
  - LIVE badge / duration pill / play overlay → Task 1. ✓
  - Loading skeleton (4 placeholders) → Task 2. ✓
  - Hide on error/empty → Task 2 guards. ✓
  - Tile tap → `VideoDetail`, See All → `Videos` → Task 2 navigation handlers. ✓
  - Insertion between `ChannelsSection` and `WebStoriesStrip` → Task 3 step 3. ✓
  - Pull-to-refresh covers `['videos']` → Task 3 step 2. ✓
  - Theming via `makeStyles(colors)` → Tasks 1 & 2. ✓
- **Placeholder scan:** No "TBD"/"TODO"/"Similar to Task N" left. All code blocks are complete and self-contained.
- **Type consistency:** `Video` imported from `../../../services/api` in both new files; `HomeStackParamList` route names `VideoDetail` / `Videos` match those registered in `mobile/src/navigation/HomeStack.tsx`; `useVideos` signature `(contentId: number | null)` is invoked with `null` matching its declared parameter type.

---

## Out of scope (explicitly not in this plan)

- Modifying any file under `mobile/src/features/videos/` (the existing Videos screen and its components).
- Adding new query keys, transformers, or API endpoints.
- Per-category filtering or infinite scroll on the home preview.
- Auto-play / inline playback on home tiles.
- Unit tests (this codebase has no test pattern committed yet — adding tests for this section without a broader testing strategy would be premature).
