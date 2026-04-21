# Mobile Videos Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `VideosScreen` (category tabs + trending strip + grid + pagination) and a `VideoDetailScreen` (YouTube WebView player + meta + share + related videos) in the mobile app, wired to the real IndiaForums API.

**Architecture:** New `mobile/src/features/videos/` module following the existing News/Celebrities pattern. API helpers + types added to the existing `mobile/src/services/api.ts`. React Query (`useInfiniteQuery` + `useQuery`) for data. React Navigation stack routes added to `HomeStack`. The Videos pill on the home `StoriesStrip` is wired as the entry point.

**Tech Stack:** React Native + Expo, TypeScript, React Navigation, React Query (`@tanstack/react-query`), `react-native-webview` (already installed), axios.

**Test strategy:** The mobile app has no automated test runner configured. Verification is via TypeScript typecheck (`npx tsc --noEmit`), Metro bundling, and manual smoke test on the Expo dev client. Each task ends with a typecheck + commit.

---

## File Structure

**New files:**
- `mobile/src/features/videos/components/CategoryTabs.tsx`
- `mobile/src/features/videos/components/TrendingVideoCard.tsx`
- `mobile/src/features/videos/components/VideoGridCard.tsx`
- `mobile/src/features/videos/components/VideoPlayer.tsx`
- `mobile/src/features/videos/components/RelatedVideoCard.tsx`
- `mobile/src/features/videos/hooks/useVideos.ts`
- `mobile/src/features/videos/hooks/useVideoDetails.ts`
- `mobile/src/features/videos/screens/VideosScreen.tsx`
- `mobile/src/features/videos/screens/VideoDetailScreen.tsx`

**Modified files:**
- `mobile/src/services/api.ts` — add `Video`, `VideoDetail` types, `VIDEO_CAT_TABS`, `VIDEO_CAT_ACCENT`, `VIDEO_CAT_GRADIENTS`, `fetchVideos`, `fetchVideoDetails`.
- `mobile/src/navigation/types.ts` — add `Videos` and `VideoDetail` to `HomeStackParamList`.
- `mobile/src/navigation/HomeStack.tsx` — register new screens.
- `mobile/src/features/home/components/StoriesStrip.tsx` — navigate to `Videos` on press.

---

## Task 1: Add Video types, category constants, and API helpers

**Files:**
- Modify: `mobile/src/services/api.ts`

- [ ] **Step 1: Add `Video` and `VideoDetail` interfaces.**

Append after the `Celebrity` interfaces (around line 160, before the `CelebritiesPayload` interface — place inside the types section):

```ts
// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

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

export interface VideosPage {
  videos: Video[];
  pagination: {
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
  };
}

export interface VideoCatTab {
  id: string;
  label: string;
  contentId: number | null;
}
```

- [ ] **Step 2: Add video category constants near the existing `CATEGORY_EMOJIS` block.**

Insert after the existing `CATEGORY_EMOJIS` constant (the one declared around line 32):

```ts
// ---------------------------------------------------------------------------
// Video category maps (kept separate from article maps — different keys)
// ---------------------------------------------------------------------------

const VIDEO_CAT_MAP: Record<number, string> = {
  5:  'tv',       6:  'tv',
  7:  'movies',   8:  'movies',   16: 'movies', 17: 'movies', 18: 'movies',
  3:  'digital',  9:  'digital',  10: 'digital', 19: 'digital',
  4:  'lifestyle', 11: 'lifestyle', 12: 'lifestyle', 13: 'lifestyle', 20: 'lifestyle',
  14: 'sports',   15: 'sports',   21: 'sports',
};

const VIDEO_CAT_LABELS: Record<string, string> = {
  tv:        'Television',
  movies:    'Movies',
  lifestyle: 'Lifestyle',
  sports:    'Sports',
  digital:   'Digital',
  celebrity: 'Celebrity',
  music:     'Music',
};

// Used for thumbnail-fallback backgrounds. React Native doesn't natively
// render CSS gradients, so we store a solid accent and let the card render
// a flat block. (If gradient rendering is later added via expo-linear-gradient,
// the start/end colors can be parsed from the prototype's linear-gradient strings.)
const VIDEO_CAT_BG: Record<string, string> = {
  tv:        '#4a1942',
  movies:    '#7f1d1d',
  digital:   '#1e293b',
  lifestyle: '#831843',
  sports:    '#14532d',
  celebrity: '#312e81',
  music:     '#1e1b4b',
};

const VIDEO_CAT_EMOJI: Record<string, string> = {
  tv:        '📺',
  movies:    '🎬',
  lifestyle: '✨',
  sports:    '🏏',
  digital:   '🎞️',
  celebrity: '👑',
  music:     '🎶',
};

export const VIDEO_CAT_TABS: VideoCatTab[] = [
  { id: 'all',       label: 'All',        contentId: null },
  { id: 'tv',        label: 'Television', contentId: 1 },
  { id: 'movies',    label: 'Movies',     contentId: 2 },
  { id: 'digital',   label: 'Digital',    contentId: 3 },
  { id: 'celebrity', label: 'Celebrity',  contentId: null },
  { id: 'sports',    label: 'Sports',     contentId: null },
  { id: 'music',     label: 'Music',      contentId: null },
];

// Per-category accent (chip bg, chip text, active-tab bar color).
// Used by CategoryTabs, VideoGridCard, TrendingVideoCard.
export const VIDEO_CAT_ACCENT: Record<string, { bg: string; text: string; bar: string }> = {
  all:       { bg: '#EEF2FF', text: '#3558F0', bar: '#3558F0' },
  tv:        { bg: '#EEF2FF', text: '#3558F0', bar: '#3558F0' },
  movies:    { bg: '#FFF7ED', text: '#C2410C', bar: '#EA580C' },
  digital:   { bg: '#F0FDF4', text: '#15803D', bar: '#16A34A' },
  celebrity: { bg: '#FDF4FF', text: '#7E22CE', bar: '#9333EA' },
  sports:    { bg: '#FFFBEB', text: '#B45309', bar: '#D97706' },
  music:     { bg: '#FFF1F2', text: '#BE123C', bar: '#E11D48' },
};

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function transformVideo(raw: any): Video {
  const catId = raw.defaultCategoryId;
  const cat = VIDEO_CAT_MAP[catId] || 'tv';
  return {
    id:           String(raw.mediaId),
    catId:        catId,
    cat,
    catLabel:     VIDEO_CAT_LABELS[cat] || cat,
    title:        raw.mediaTitle || '',
    timeAgo:      timeAgo(raw.publishedWhen),
    duration:     raw.duration || null,
    bg:           VIDEO_CAT_BG[cat] || VIDEO_CAT_BG.tv,
    emoji:        VIDEO_CAT_EMOJI[cat] || '📺',
    thumbnail:    raw.thumbnail || null,
    live:         false,
    featured:     !!raw.featured,
    views:        raw.viewCount > 0 ? formatViews(raw.viewCount) : null,
    viewCount:    raw.viewCount || 0,
    commentCount: raw.commentCount || 0,
    description:  raw.mediaDesc || '',
  };
}

function transformVideoDetail(data: any): VideoDetail | null {
  const payload = data?.data || data;
  const media = payload?.media;
  if (!media) return null;

  const cat = VIDEO_CAT_MAP[media.defaultCategoryId] || 'tv';

  return {
    id:            String(media.mediaId),
    catId:         media.defaultCategoryId,
    cat,
    catLabel:      VIDEO_CAT_LABELS[cat] || cat,
    title:         media.mediaTitle || '',
    timeAgo:       timeAgo(media.publishedWhen),
    duration:      media.duration || null,
    bg:            VIDEO_CAT_BG[cat] || VIDEO_CAT_BG.tv,
    emoji:         VIDEO_CAT_EMOJI[cat] || '📺',
    thumbnail:     media.thumbnailUrl || null,
    live:          false,
    featured:      !!media.featured,
    views:         media.viewCount > 0 ? formatViews(media.viewCount) : null,
    viewCount:     media.viewCount || 0,
    commentCount:  media.commentCount || 0,
    description:   media.mediaDesc || '',
    contentId:     media.contentId || null,
    keywords:      media.keywords || '',
    relatedVideos: (payload?.relatedMedias || []).map(transformVideo),
  };
}
```

- [ ] **Step 3: Add `fetchVideos` and `fetchVideoDetails` at the bottom of the file (before the final line).**

```ts
// ---------------------------------------------------------------------------
// Videos API
// ---------------------------------------------------------------------------

export async function fetchVideos(
  page = 1,
  pageSize = 20,
  contentId: number | null = null,
): Promise<VideosPage> {
  const params: Record<string, string | number> = { pageNumber: page, pageSize };
  if (contentId) {
    params.contentType = 1000;
    params.contentId = contentId;
  }

  const { data } = await apiClient.get('/videos/list', { params });
  const payload = data?.data || data;
  const rawVideos = payload?.medias || [];

  return {
    videos: rawVideos.map(transformVideo),
    pagination: {
      currentPage: page,
      pageSize,
      hasNextPage: rawVideos.length >= pageSize,
    },
  };
}

export async function fetchVideoDetails(videoId: string): Promise<VideoDetail | null> {
  const { data } = await apiClient.get(`/videos/${videoId}/details`);
  return transformVideoDetail(data);
}
```

- [ ] **Step 4: Typecheck.**

Run (from repo root): `cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit.**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(videos): add Video types, category maps, and fetch helpers"
```

(Ask user first before running commit — see saved preference.)

---

## Task 2: Add Video routes to navigation types and stack

**Files:**
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/HomeStack.tsx`

- [ ] **Step 1: Add route params to `HomeStackParamList`.**

In `mobile/src/navigation/types.ts`, inside `HomeStackParamList` (currently ends after `QuizLeaderboard`), replace the line `Shorts: undefined;` block to add `Videos` and `VideoDetail`. Keep all other entries. The updated fragment:

```ts
  Videos: undefined;
  VideoDetail: { video: import('../services/api').Video };
  Shorts: undefined;
```

- [ ] **Step 2: Register placeholder-backed screens in `HomeStack.tsx`.**

In `mobile/src/navigation/HomeStack.tsx`, replace the existing line:
```tsx
      <Stack.Screen name="Shorts" component={PlaceholderScreen} />
```

with:
```tsx
      <Stack.Screen name="Videos" component={PlaceholderScreen} />
      <Stack.Screen name="VideoDetail" component={PlaceholderScreen} />
      <Stack.Screen name="Shorts" component={PlaceholderScreen} />
```

(Real components replace the placeholders in Task 9, once they exist and won't break typecheck.)

- [ ] **Step 3: Typecheck.**

`cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit.**

```bash
git add mobile/src/navigation/types.ts mobile/src/navigation/HomeStack.tsx
git commit -m "feat(videos): add Videos and VideoDetail routes to HomeStack"
```

---

## Task 3: Data hooks (`useVideos`, `useVideoDetails`)

**Files:**
- Create: `mobile/src/features/videos/hooks/useVideos.ts`
- Create: `mobile/src/features/videos/hooks/useVideoDetails.ts`

- [ ] **Step 1: Create `useVideos.ts`.**

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchVideos, type VideosPage } from '../../../services/api';

const PAGE_SIZE = 20;

export function useVideos(contentId: number | null) {
  return useInfiniteQuery<VideosPage>({
    queryKey: ['videos', contentId ?? 'all'],
    queryFn: ({ pageParam = 1 }) => fetchVideos(pageParam as number, PAGE_SIZE, contentId),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Create `useVideoDetails.ts`.**

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchVideoDetails } from '../../../services/api';

export function useVideoDetails(id: string) {
  return useQuery({
    queryKey: ['videoDetails', id],
    queryFn: () => fetchVideoDetails(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
```

- [ ] **Step 3: Typecheck.**

`cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit.**

```bash
git add mobile/src/features/videos/hooks/
git commit -m "feat(videos): add useVideos and useVideoDetails React Query hooks"
```

---

## Task 4: `CategoryTabs` component

**Files:**
- Create: `mobile/src/features/videos/components/CategoryTabs.tsx`

- [ ] **Step 1: Implement the component.**

```tsx
import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { VIDEO_CAT_ACCENT, type VideoCatTab } from '../../../services/api';

interface Props {
  tabs: VideoCatTab[];
  active: string;
  onChange: (id: string) => void;
}

export default function CategoryTabs({ tabs, active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          const accent = VIDEO_CAT_ACCENT[tab.id] || VIDEO_CAT_ACCENT.all;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[
                styles.tab,
                isActive && { borderColor: accent.bar, backgroundColor: accent.bg },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  isActive && { color: accent.text, fontWeight: '700' },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F5F5F',
  },
});
```

- [ ] **Step 2: Typecheck.**

`cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit.**

```bash
git add mobile/src/features/videos/components/CategoryTabs.tsx
git commit -m "feat(videos): add CategoryTabs component"
```

---

## Task 5: `VideoGridCard` and `TrendingVideoCard`

**Files:**
- Create: `mobile/src/features/videos/components/VideoGridCard.tsx`
- Create: `mobile/src/features/videos/components/TrendingVideoCard.tsx`

- [ ] **Step 1: Create `VideoGridCard.tsx`.**

```tsx
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VIDEO_CAT_ACCENT, type Video } from '../../../services/api';

interface Props {
  video: Video;
  onPress: (video: Video) => void;
}

export default function VideoGridCard({ video, onPress }: Props) {
  const accent = VIDEO_CAT_ACCENT[video.cat] || VIDEO_CAT_ACCENT.all;
  return (
    <Pressable
      onPress={() => onPress(video)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: video.bg }]}>
        {video.thumbnail ? (
          <Image source={{ uri: video.thumbnail }} style={styles.img} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{video.emoji}</Text>
        )}

        <View style={styles.playWrap}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={14} color="#FFFFFF" />
          </View>
        </View>

        {video.duration ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={[styles.catChip, { backgroundColor: accent.bg }]}>
          <Text style={[styles.catChipText, { color: accent.text }]} numberOfLines={1}>
            {video.catLabel}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={10} color="#8A8A8A" />
          <Text style={styles.time}>{video.timeAgo}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  pressed: { opacity: 0.75 },
  thumb: {
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 42 },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
  durationText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  body: { padding: 10, gap: 6 },
  catChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  title: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', lineHeight: 17 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontSize: 10, color: '#8A8A8A' },
});
```

- [ ] **Step 2: Create `TrendingVideoCard.tsx`.**

```tsx
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VIDEO_CAT_ACCENT, type Video } from '../../../services/api';

interface Props {
  video: Video;
  onPress: (video: Video) => void;
}

export default function TrendingVideoCard({ video, onPress }: Props) {
  const accent = VIDEO_CAT_ACCENT[video.cat] || VIDEO_CAT_ACCENT.all;
  return (
    <Pressable
      onPress={() => onPress(video)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: video.bg }]}>
        {video.thumbnail ? (
          <Image source={{ uri: video.thumbnail }} style={styles.img} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{video.emoji}</Text>
        )}

        <View style={styles.scrim} />

        <View
          style={[
            styles.catChip,
            video.live ? styles.liveChip : { backgroundColor: accent.bar },
          ]}
        >
          {video.live ? <View style={styles.liveDot} /> : null}
          <Text style={styles.catChipText}>{video.catLabel}</Text>
        </View>

        {video.duration || video.live ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{video.live ? '● LIVE' : video.duration}</Text>
          </View>
        ) : null}

        {!video.live ? (
          <View style={styles.playWrap}>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={18} color="#FFFFFF" />
            </View>
          </View>
        ) : null}

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={10} color="#FFFFFF" />
            <Text style={styles.meta}>{video.timeAgo}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 12,
  },
  pressed: { opacity: 0.85 },
  thumb: { aspectRatio: 16 / 9, position: 'relative' },
  img: { width: '100%', height: '100%' },
  emoji: {
    fontSize: 60,
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 160,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  catChip: {
    position: 'absolute',
    left: 10,
    top: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveChip: { backgroundColor: '#DC2626' },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  catChipText: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  duration: {
    position: 'absolute',
    right: 10,
    top: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  durationText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: '#FFFFFF', fontSize: 10, opacity: 0.9 },
});
```

- [ ] **Step 3: Typecheck.**

`cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit.**

```bash
git add mobile/src/features/videos/components/VideoGridCard.tsx mobile/src/features/videos/components/TrendingVideoCard.tsx
git commit -m "feat(videos): add VideoGridCard and TrendingVideoCard"
```

---

## Task 6: `VideosScreen`

**Files:**
- Create: `mobile/src/features/videos/screens/VideosScreen.tsx`

- [ ] **Step 1: Implement the screen.**

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import SectionHeader from '../../../components/ui/SectionHeader';
import type { HomeStackParamList } from '../../../navigation/types';
import { VIDEO_CAT_TABS, type Video } from '../../../services/api';

import CategoryTabs from '../components/CategoryTabs';
import TrendingVideoCard from '../components/TrendingVideoCard';
import VideoGridCard from '../components/VideoGridCard';
import { useVideos } from '../hooks/useVideos';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Videos'>;

export default function VideosScreen() {
  const navigation = useNavigation<Nav>();
  const [activeCat, setActiveCat] = useState('all');
  const activeTab = VIDEO_CAT_TABS.find((t) => t.id === activeCat) || VIDEO_CAT_TABS[0];

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVideos(activeTab.contentId);

  const allVideos = useMemo<Video[]>(
    () => (data?.pages || []).flatMap((p) => p.videos),
    [data],
  );

  // Client-side filter fallback for categories without server contentId
  const filtered = useMemo(() => {
    if (activeCat === 'all' || activeTab.contentId) return allVideos;
    return allVideos.filter((v) => v.cat === activeCat);
  }, [allVideos, activeCat, activeTab]);

  const trending = useMemo(() => {
    const featured = filtered.filter((v) => v.featured);
    if (featured.length >= 2) return featured.slice(0, 4);
    return filtered.slice(0, 4);
  }, [filtered]);

  const grid = useMemo(() => {
    const trendIds = new Set(trending.map((v) => v.id));
    return filtered.filter((v) => !trendIds.has(v.id));
  }, [filtered, trending]);

  const handlePress = (video: Video) => {
    navigation.navigate('VideoDetail', { video });
  };

  return (
    <View style={styles.screen}>
      <TopNavBack title="Videos" onBack={() => navigation.goBack()} />

      <CategoryTabs
        tabs={VIDEO_CAT_TABS}
        active={activeCat}
        onChange={setActiveCat}
      />

      {isLoading ? (
        <LoadingState height={400} />
      ) : isError ? (
        <ErrorState message="Couldn't load videos" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={grid}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <VideoGridCard video={item} onPress={handlePress} />
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            trending.length > 0 ? (
              <View>
                <SectionHeader title="Trending Now" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendingRow}
                >
                  {trending.map((v) => (
                    <TrendingVideoCard key={v.id} video={v} onPress={handlePress} />
                  ))}
                </ScrollView>
                <SectionHeader
                  title={activeCat === 'all' ? 'Latest Videos' : activeTab.label}
                />
              </View>
            ) : (
              <SectionHeader
                title={activeCat === 'all' ? 'Latest Videos' : activeTab.label}
              />
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No videos found in this category.</Text>
            </View>
          }
          ListFooterComponent={
            hasNextPage ? (
              <Pressable
                onPress={() => fetchNextPage()}
                style={styles.loadMore}
                disabled={isFetchingNextPage}
              >
                <Text style={styles.loadMoreText}>
                  {isFetchingNextPage ? 'Loading…' : 'Load More Videos'}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F7' },
  listContent: { paddingBottom: 32 },
  gridRow: { gap: 10, paddingHorizontal: 12 },
  gridCell: { flex: 1, marginBottom: 10 },
  trendingRow: { paddingLeft: 14, paddingRight: 2, paddingBottom: 4 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8A8A8A', fontSize: 14 },
  loadMore: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
  },
  loadMoreText: { color: '#3558F0', fontWeight: '700', fontSize: 14 },
});
```

- [ ] **Step 2: Typecheck.**

`cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit.**

```bash
git add mobile/src/features/videos/screens/VideosScreen.tsx
git commit -m "feat(videos): add VideosScreen with tabs, trending strip, and paginated grid"
```

---

## Task 7: `VideoPlayer` and `RelatedVideoCard` components

**Files:**
- Create: `mobile/src/features/videos/components/VideoPlayer.tsx`
- Create: `mobile/src/features/videos/components/RelatedVideoCard.tsx`

- [ ] **Step 1: Create `VideoPlayer.tsx`.**

```tsx
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  youtubeId: string;
}

export default function VideoPlayer({ youtubeId }: Props) {
  const uri = `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`;

  return (
    <View style={styles.wrap}>
      <WebView
        source={{ uri }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
});
```

- [ ] **Step 2: Create `RelatedVideoCard.tsx`.**

```tsx
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Video } from '../../../services/api';

interface Props {
  video: Video;
  onPress: (video: Video) => void;
}

export default function RelatedVideoCard({ video, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(video)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: video.bg }]}>
        {video.thumbnail ? (
          <Image source={{ uri: video.thumbnail }} style={styles.img} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{video.emoji}</Text>
        )}
        <View style={styles.playWrap}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={12} color="#FFF" />
          </View>
        </View>
        {video.duration ? (
          <View style={styles.duration}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.cat} numberOfLines={1}>{video.catLabel}</Text>
        <Text style={styles.title} numberOfLines={3}>{video.title}</Text>
        <Text style={styles.time}>{video.timeAgo}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  pressed: { opacity: 0.7 },
  thumb: {
    width: 140,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 30 },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  duration: {
    position: 'absolute', right: 5, bottom: 5,
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  durationText: { color: '#FFF', fontSize: 9, fontWeight: '600' },
  body: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  cat: { fontSize: 10, fontWeight: '700', color: '#3558F0', letterSpacing: 0.3 },
  title: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', lineHeight: 17 },
  time: { fontSize: 10, color: '#8A8A8A' },
});
```

- [ ] **Step 3: Typecheck.**

`cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit.**

```bash
git add mobile/src/features/videos/components/VideoPlayer.tsx mobile/src/features/videos/components/RelatedVideoCard.tsx
git commit -m "feat(videos): add VideoPlayer (WebView) and RelatedVideoCard"
```

---

## Task 8: `VideoDetailScreen`

**Files:**
- Create: `mobile/src/features/videos/screens/VideoDetailScreen.tsx`

- [ ] **Step 1: Implement the screen.**

```tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Share,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import SectionHeader from '../../../components/ui/SectionHeader';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Video } from '../../../services/api';

import VideoPlayer from '../components/VideoPlayer';
import RelatedVideoCard from '../components/RelatedVideoCard';
import { useVideoDetails } from '../hooks/useVideoDetails';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'VideoDetail'>;
type Rt  = RouteProp<HomeStackParamList, 'VideoDetail'>;

const DESC_LIMIT = 150;

export default function VideoDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const video = route.params.video;

  const { data: details } = useVideoDetails(video.id);
  const enriched = useMemo(() => ({ ...video, ...(details || {}) }), [video, details]);

  const [descExpanded, setDescExpanded] = useState(false);
  const shareUrl = `https://www.indiaforums.com/videos/${enriched.id}`;

  const onShare = async () => {
    try {
      await Share.share({ message: `${enriched.title}\n${shareUrl}`, url: shareUrl });
    } catch {}
  };

  const onCopy = async () => {
    try { await Clipboard.setStringAsync(shareUrl); } catch {}
  };

  const onRelatedPress = (v: Video) => {
    navigation.replace('VideoDetail', { video: v });
  };

  const hasDesc = !!enriched.description;
  const shortDesc = hasDesc && enriched.description.length > DESC_LIMIT
    ? enriched.description.slice(0, DESC_LIMIT) + '…'
    : enriched.description;

  const related = details?.relatedVideos || [];

  return (
    <View style={styles.screen}>
      <TopNavBack title="" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {enriched.contentId ? (
          <VideoPlayer youtubeId={enriched.contentId} />
        ) : (
          <View style={[styles.fallback, { backgroundColor: enriched.bg }]}>
            {enriched.thumbnail ? (
              <Image source={{ uri: enriched.thumbnail }} style={styles.fallbackImg} resizeMode="cover" />
            ) : (
              <Text style={styles.fallbackEmoji}>{enriched.emoji}</Text>
            )}
            <View style={styles.fallbackPlay}>
              <Ionicons name="play" size={28} color="#FFF" />
            </View>
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.breadcrumb}>
            Home <Text style={styles.bcSep}>›</Text> {enriched.catLabel} <Text style={styles.bcSep}>›</Text>{' '}
            <Text style={styles.bcActive}>Videos</Text>
          </Text>

          <Text style={styles.title}>{enriched.title}</Text>

          <View style={styles.metaRow}>
            {enriched.views ? (
              <>
                <View style={styles.metaChip}>
                  <Ionicons name="eye-outline" size={12} color="#6B6B6B" />
                  <Text style={styles.metaText}>{enriched.views} views</Text>
                </View>
                <View style={styles.metaDot} />
              </>
            ) : null}
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={12} color="#6B6B6B" />
              <Text style={styles.metaText}>{enriched.timeAgo}</Text>
            </View>
            {enriched.duration ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>{enriched.duration}</Text>
              </>
            ) : null}
          </View>

          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Share:</Text>
            <Pressable onPress={onShare} style={[styles.shareBtn, { backgroundColor: '#1877F2' }]}>
              <Ionicons name="logo-facebook" size={14} color="#FFF" />
            </Pressable>
            <Pressable onPress={onShare} style={[styles.shareBtn, { backgroundColor: '#000' }]}>
              <Ionicons name="logo-twitter" size={14} color="#FFF" />
            </Pressable>
            <Pressable onPress={onShare} style={[styles.shareBtn, { backgroundColor: '#25D366' }]}>
              <Ionicons name="logo-whatsapp" size={14} color="#FFF" />
            </Pressable>
            <Pressable onPress={onCopy} style={[styles.shareBtn, { backgroundColor: '#F1F1F1' }]}>
              <Ionicons name="copy-outline" size={14} color="#333" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {hasDesc ? (
            <View style={styles.descBlock}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.descText}>
                {descExpanded ? enriched.description : shortDesc}
              </Text>
              {enriched.description.length > DESC_LIMIT ? (
                <Pressable onPress={() => setDescExpanded((v) => !v)}>
                  <Text style={styles.readMore}>
                    {descExpanded ? 'Show Less' : 'Read More'}
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.divider} />
            </View>
          ) : null}

          {related.length > 0 ? (
            <View>
              <SectionHeader title="Related Videos" />
              <View style={styles.relatedList}>
                {related.map((v) => (
                  <RelatedVideoCard key={v.id} video={v} onPress={onRelatedPress} />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F7' },
  scrollContent: { paddingBottom: 40 },
  fallback: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  fallbackEmoji: { fontSize: 80 },
  fallbackPlay: {
    position: 'absolute',
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 14, gap: 10 },
  breadcrumb: { fontSize: 11, color: '#8A8A8A' },
  bcSep: { color: '#C4C4C4' },
  bcActive: { color: '#1A1A1A', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', lineHeight: 26 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B6B6B' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#C4C4C4' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  shareLabel: { fontSize: 12, color: '#6B6B6B', marginRight: 4 },
  shareBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 14 },
  descBlock: {},
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6B6B6B', letterSpacing: 0.4, marginBottom: 6 },
  descText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
  readMore: { fontSize: 12, fontWeight: '700', color: '#3558F0', marginTop: 6 },
  relatedList: { paddingHorizontal: 4 },
});
```

- [ ] **Step 2: Verify `expo-clipboard` is installed.**

Run: `grep -E "expo-clipboard" "mobile/package.json"`

If not installed, run: `cd mobile && npx expo install expo-clipboard`
Then commit the `package.json` / `package-lock.json` change in its own commit:
```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore: add expo-clipboard for share copy button"
```

- [ ] **Step 3: Typecheck.**

`cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit.**

```bash
git add mobile/src/features/videos/screens/VideoDetailScreen.tsx
git commit -m "feat(videos): add VideoDetailScreen with player, share, description, related"
```

---

## Task 9: Wire navigation — real screens + StoriesStrip entry

**Files:**
- Modify: `mobile/src/navigation/HomeStack.tsx`
- Modify: `mobile/src/features/home/components/StoriesStrip.tsx`

- [ ] **Step 1: Replace placeholder imports in `HomeStack.tsx`.**

Near the existing imports (after the `CelebrityDetailScreen` import), add:

```tsx
import VideosScreen from '../features/videos/screens/VideosScreen';
import VideoDetailScreen from '../features/videos/screens/VideoDetailScreen';
```

Replace the two placeholder lines added in Task 2:
```tsx
      <Stack.Screen name="Videos" component={PlaceholderScreen} />
      <Stack.Screen name="VideoDetail" component={PlaceholderScreen} />
```

with:
```tsx
      <Stack.Screen name="Videos" component={VideosScreen} />
      <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
```

- [ ] **Step 2: Wire the `StoriesStrip` press handler.**

In `mobile/src/features/home/components/StoriesStrip.tsx`, update `handlePress`:

```tsx
  const handlePress = (s: Story) => {
    if (s.label === 'Celebrities') {
      navigation.navigate('Celebrities');
      return;
    }
    if (s.label === 'Videos') {
      navigation.navigate('Videos');
      return;
    }
    onItemPress?.(s);
  };
```

- [ ] **Step 3: Typecheck.**

`cd mobile && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit.**

```bash
git add mobile/src/navigation/HomeStack.tsx mobile/src/features/home/components/StoriesStrip.tsx
git commit -m "feat(videos): wire VideosScreen/VideoDetailScreen into HomeStack and StoriesStrip"
```

---

## Task 10: Manual smoke test

**Files:** None.

- [ ] **Step 1: Start Expo dev server.**

Run (interactive): `cd mobile && npx expo start`

- [ ] **Step 2: Perform the full flow on the Expo Go / dev client.**

Walk through:
1. Open app → Home tab → tap "Videos" circle in the Stories strip → `VideosScreen` opens.
2. Verify category tabs render; all tabs tappable; "All" is selected by default.
3. Verify trending strip shows at least one card when data loads; scrolling horizontally works.
4. Verify grid renders in 2 columns; each card has thumbnail, category chip, title, time.
5. Scroll down, tap "Load More Videos" → next page appends.
6. Switch tabs (e.g. Movies, Sports) → list refetches/filters correctly. Fallback categories (Celebrity, Sports, Music) client-filter correctly.
7. Tap a grid card → `VideoDetailScreen` opens. Player loads YouTube embed. Title, views, time, duration show.
8. Tap "Read More" on description → expands; "Show Less" collapses.
9. Tap a share button → native share sheet appears. Tap copy → no crash.
10. Scroll to Related Videos → tap one → detail replaces with the new video; player reloads.
11. Back gesture returns to Videos list.
12. Toggle airplane mode before opening Videos → ErrorState shows with "Try again"; restoring network + retry recovers.

- [ ] **Step 3: If any issue appears, file it as a follow-up note in the plan or (if trivially fixable) patch inline and commit.**

No automated assertions — this is a human-in-the-loop check.

---

## Follow-up (out of scope for this plan)

- Reactions row on detail screen.
- Comments section (needs API).
- Tags chips (from `enriched.keywords`).
- Skeleton shimmer cards for the grid/trending strip loading state (currently a single spinner).
- Native `expo-video` player — depends on backend exposing direct media URLs.
