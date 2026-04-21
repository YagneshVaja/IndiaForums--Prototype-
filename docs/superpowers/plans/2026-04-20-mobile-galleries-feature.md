# Mobile Galleries Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Galleries feature (list + detail + lightbox) from the web prototype (`indiaforums/`) to the React Native mobile app (`mobile/`), mirroring the Videos feature's structure.

**Architecture:** Feature folder at `mobile/src/features/galleries/` with screens, components, and hooks. API layer additions to `mobile/src/services/api.ts`. Two new routes in `HomeStack`. Uses `@tanstack/react-query` (`useInfiniteQuery` + `useQuery`) with mock fallback on network error.

**Tech Stack:** React Native, Expo, TypeScript, React Query, `@react-navigation/native-stack`, `expo-clipboard`, `@expo/vector-icons`.

**Spec:** [docs/superpowers/specs/2026-04-20-mobile-galleries-feature-design.md](../specs/2026-04-20-mobile-galleries-feature-design.md)

**Verification model (no unit tests):** `mobile/` has `jest` declared but no test files and no jest config — existing features (Videos, Celebrities) ship without tests. Each task's verification gate is:
1. `cd mobile && npm run tsc` passes (no type errors).
2. `cd mobile && npm run lint` passes (no new lint errors).
3. Manual QA at milestones (Tasks 8, 14) — start `npm start`, walk the flow in Expo Go / simulator.

---

## File map

**New files:**
- `mobile/src/features/galleries/hooks/useGalleries.ts`
- `mobile/src/features/galleries/hooks/useGalleryDetails.ts`
- `mobile/src/features/galleries/components/CategoryTabs.tsx`
- `mobile/src/features/galleries/components/GalleryCard.tsx`
- `mobile/src/features/galleries/components/GalleryHeroCard.tsx`
- `mobile/src/features/galleries/components/GallerySkeleton.tsx`
- `mobile/src/features/galleries/components/PhotoCell.tsx`
- `mobile/src/features/galleries/components/PhotoGrid.tsx`
- `mobile/src/features/galleries/components/RelatedGalleryCard.tsx`
- `mobile/src/features/galleries/components/Lightbox.tsx`
- `mobile/src/features/galleries/screens/GalleriesScreen.tsx`
- `mobile/src/features/galleries/screens/GalleryDetailScreen.tsx`

**Modified files:**
- `mobile/src/services/api.ts` — add Gallery types, constants, transforms, fetch fns, mock helpers.
- `mobile/src/navigation/types.ts` — extend `HomeStackParamList`.
- `mobile/src/navigation/HomeStack.tsx` — register two new screens.
- `mobile/src/features/home/screens/HomeScreen.tsx` — wire `onSeeAll` + `onGalleryPress`.

---

## Task 1: Add Gallery types and constants to `api.ts`

**Files:**
- Modify: `mobile/src/services/api.ts` (append a new section; do NOT touch existing code)

- [ ] **Step 1: Open `mobile/src/services/api.ts` and locate the end of the Videos mock section (near `getMockVideoDetail`, ~line 1239).** The new Galleries section goes after it.

- [ ] **Step 2: Append the following section at the end of the file:**

```ts
// ---------------------------------------------------------------------------
// Galleries — types & constants
// ---------------------------------------------------------------------------

export interface Gallery {
  id: string | number;
  title: string;
  pageUrl: string | null;
  cat: string | null;
  catLabel: string | null;
  count: number;
  emoji: string;
  bg: string;
  time: string;
  featured: boolean;
  thumbnail: string | null;
  viewCount: number;
  views: string | null;
}

export interface GalleryPhoto {
  id: string | number;
  imageUrl: string | null;
  caption: string;
  tags: { id: string | number; name: string }[];
  emoji: string;
  bg: string;
}

export interface GalleryDetail extends Gallery {
  description: string;
  keywords: string[];
  relatedGalleries: Gallery[];
  photos: GalleryPhoto[];
}

export interface GalleriesPage {
  galleries: Gallery[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GalleryCatTab {
  id: string;
  label: string;
  categoryId: number | null;
}

export const GALLERY_CAT_TABS: GalleryCatTab[] = [
  { id: 'all',       label: 'All',       categoryId: null },
  { id: 'tv',        label: 'TV',        categoryId: 1    },
  { id: 'movies',    label: 'Movies',    categoryId: 2    },
  { id: 'digital',   label: 'Digital',   categoryId: 3    },
  { id: 'lifestyle', label: 'Lifestyle', categoryId: 4    },
  { id: 'sports',    label: 'Sports',    categoryId: 14   },
];

const GALLERY_CAT_MAP: Record<number, string> = {
  1:  'tv',
  2:  'movies',
  3:  'digital',
  4:  'lifestyle',
  14: 'sports',
};

const GALLERY_CAT_LABELS: Record<string, string> = {
  tv:        'TV',
  movies:    'Movies',
  digital:   'Digital',
  lifestyle: 'Lifestyle',
  sports:    'Sports',
};

const GALLERY_CAT_BG: Record<string, string> = {
  tv:        '#4a1942',
  movies:    '#7f1d1d',
  digital:   '#1e293b',
  lifestyle: '#831843',
  sports:    '#14532d',
};

const GALLERY_CAT_EMOJI: Record<string, string> = {
  tv:        '📺',
  movies:    '🎬',
  digital:   '🎞️',
  lifestyle: '✨',
  sports:    '🏏',
};

const GALLERY_DEFAULT_BG    = '#667eea';
const GALLERY_DEFAULT_EMOJI = '📸';
```

- [ ] **Step 3: Run `cd mobile && npm run tsc` — verify no type errors.**

- [ ] **Step 4: Run `cd mobile && npm run lint` — verify no new lint errors.**

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(galleries): add Gallery types and category constants"
```

---

## Task 2: Add transform helpers for Gallery list and detail

**Files:**
- Modify: `mobile/src/services/api.ts` (append after the constants block from Task 1)

- [ ] **Step 1: Append the following transforms below the constants block:**

```ts
// ---------------------------------------------------------------------------
// Galleries — transforms
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformGallery(raw: any): Gallery {
  const catId = raw.defaultCategoryId ?? raw.categoryId ?? null;
  const cat   = catId != null ? (GALLERY_CAT_MAP[catId] || null) : null;
  const vc    = raw.viewCount || 0;

  return {
    id:         raw.mediaGalleryId ?? raw.galleryId ?? raw.id,
    title:      raw.mediaGalleryName ?? raw.title ?? raw.galleryTitle ?? '',
    pageUrl:    raw.pageUrl ?? null,
    cat,
    catLabel:   cat ? (GALLERY_CAT_LABELS[cat] || null) : null,
    count:      raw.mediaCount ?? raw.photoCount ?? raw.count ?? 0,
    emoji:      cat ? (GALLERY_CAT_EMOJI[cat] || GALLERY_DEFAULT_EMOJI) : GALLERY_DEFAULT_EMOJI,
    bg:         cat ? (GALLERY_CAT_BG[cat] || GALLERY_DEFAULT_BG) : GALLERY_DEFAULT_BG,
    time:       timeAgo(raw.publishedWhen ?? raw.publishDate ?? raw.createdAt ?? ''),
    featured:   raw.featured ?? raw.isFeatured ?? false,
    thumbnail:  raw.thumbnailUrl ?? raw.thumbnail ?? null,
    viewCount:  vc,
    views:      vc > 0 ? formatViews(vc) : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformGalleryDetail(data: any): GalleryDetail | null {
  const payload = data?.data ?? data;
  const raw     = payload?.mediaGallery ?? payload?.gallery ?? payload;

  if (!raw?.mediaGalleryId && !raw?.galleryId && !raw?.id) {
    return null;
  }

  const base       = transformGallery(raw);
  const catId      = raw.defaultCategoryId ?? raw.categoryId ?? null;
  const cat        = catId != null ? (GALLERY_CAT_MAP[catId] || null) : null;
  const fallbackBg = cat ? (GALLERY_CAT_BG[cat] || GALLERY_DEFAULT_BG) : GALLERY_DEFAULT_BG;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawPhotos: any[] = payload?.photos ?? raw?.photos ?? [];

  const photos: GalleryPhoto[] = rawPhotos.map((p, i) => {
    let tags: { id: string | number; name: string }[] = [];
    if (p.jsonData) {
      try {
        const parsed = JSON.parse(p.jsonData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags = (parsed?.json || []).map((t: any) => ({ id: t.id, name: t.name }));
      } catch {
        tags = [];
      }
    }
    return {
      id:       p.mediaId ?? p.photoId ?? p.imageId ?? i,
      imageUrl: p.thumbnail ?? p.thumbnailUrl ?? p.imageUrl ?? p.url ?? null,
      caption:  p.mediaTitle ?? p.mediaDesc ?? p.caption ?? '',
      tags,
      emoji:    GALLERY_DEFAULT_EMOJI,
      bg:       fallbackBg,
    };
  });

  const description = raw.mediaGalleryDesc ?? raw.description ?? '';
  const keywords    = raw.keywords
    ? String(raw.keywords).split(',').map((k: string) => k.trim()).filter(Boolean)
    : [];
  const relatedGalleries = (payload?.relatedMediaGalleries ?? []).map(transformGallery);

  const heroThumbnail = photos[0]?.imageUrl ?? base.thumbnail ?? null;

  return {
    ...base,
    thumbnail: heroThumbnail,
    count:     photos.length || base.count,
    description,
    keywords,
    relatedGalleries,
    photos,
  };
}
```

- [ ] **Step 2: Run `cd mobile && npm run tsc` — verify no type errors.**

- [ ] **Step 3: Run `cd mobile && npm run lint` — verify no new lint errors.**

- [ ] **Step 4: Commit**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(galleries): add gallery transforms"
```

---

## Task 3: Add fetch functions and mock fallback

**Files:**
- Modify: `mobile/src/services/api.ts` (append after transforms from Task 2)

- [ ] **Step 1: Append the following functions at the end of the file:**

```ts
// ---------------------------------------------------------------------------
// Galleries — fetch functions
// ---------------------------------------------------------------------------

export async function fetchMediaGalleries(
  page = 1,
  pageSize = 25,
  categoryId: number | null = null,
): Promise<GalleriesPage> {
  const params: Record<string, string | number | boolean> = {
    pageNumber:    page,
    pageSize,
    publishedOnly: false,
    contentType:   1000,
  };
  if (categoryId) params.contentId = categoryId;

  try {
    const { data } = await apiClient.get('/media-galleries/list', { params });
    const payload       = data?.data ?? data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawGalleries: any[] = payload?.galleries ?? payload?.mediaGalleries ?? [];
    const rawPagination = data?.pagination ?? payload?.pagination;

    const pagination = rawPagination || {
      currentPage:     page,
      pageSize,
      totalPages:      1,
      totalItems:      rawGalleries.length,
      hasNextPage:     false,
      hasPreviousPage: false,
    };

    return {
      galleries: rawGalleries.map(transformGallery),
      pagination,
    };
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchMediaGalleries failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockGalleriesPage(page, pageSize, categoryId);
  }
}

export async function fetchMediaGalleryDetails(
  id: string | number,
): Promise<GalleryDetail | null> {
  try {
    const { data } = await apiClient.get(`/media-galleries/${id}/details`);
    return transformGalleryDetail(data);
  } catch (err: unknown) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.error('[API] fetchMediaGalleryDetails failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockGalleryDetail(id);
  }
}

// ---------------------------------------------------------------------------
// Galleries — mock fallback
// ---------------------------------------------------------------------------

function mockGallery(
  id: number,
  cat: 'tv' | 'movies' | 'digital' | 'lifestyle' | 'sports',
  title: string,
  count: number,
  seed: string,
  featured = false,
): Gallery {
  return {
    id,
    title,
    pageUrl:   null,
    cat,
    catLabel:  GALLERY_CAT_LABELS[cat],
    count,
    emoji:     GALLERY_CAT_EMOJI[cat],
    bg:        GALLERY_CAT_BG[cat],
    time:      '2 hours ago',
    featured,
    thumbnail: `https://picsum.photos/seed/${seed}/480/360`,
    viewCount: 12_400,
    views:     '12.4K',
  };
}

function getMockGalleriesPage(
  page: number,
  pageSize: number,
  categoryId: number | null,
): GalleriesPage {
  const all: Gallery[] = [
    mockGallery(1,  'tv',        'Anupamaa Cast Behind The Scenes — Week 12',          24, 'g1', true),
    mockGallery(2,  'tv',        'Yeh Rishta Kya Kehlata Hai — Romantic Moments',      18, 'g2'),
    mockGallery(3,  'movies',    'Stree 2 — Grand Premiere Night in Mumbai',           42, 'g3', true),
    mockGallery(4,  'movies',    'Animal — Ranbir Kapoor Exclusive BTS Gallery',       27, 'g4'),
    mockGallery(5,  'digital',   'Mirzapur 3 — Official Stills Released',              21, 'g5', true),
    mockGallery(6,  'digital',   'Panchayat Season 3 — Village Life Captured',         19, 'g6'),
    mockGallery(7,  'lifestyle', 'Deepika Padukone — Cannes 2026 Looks',               20, 'g7', true),
    mockGallery(8,  'lifestyle', 'Alia Bhatt — Mom Moments & Family Pics',             18, 'g8'),
    mockGallery(9,  'sports',    'IPL 2026 — MI vs CSK Full Highlights',               56, 'g9', true),
    mockGallery(10, 'sports',    'Virat Kohli — Century Celebrations Gallery',         29, 'g10'),
  ];

  const cat = categoryId != null ? GALLERY_CAT_MAP[categoryId] : null;
  const filtered = cat ? all.filter(g => g.cat === cat) : all;

  return {
    galleries: filtered,
    pagination: {
      currentPage:     page,
      pageSize,
      totalPages:      1,
      totalItems:      filtered.length,
      hasNextPage:     false,
      hasPreviousPage: false,
    },
  };
}

function getMockGalleryDetail(id: string | number): GalleryDetail {
  const base = getMockGalleriesPage(1, 25, null).galleries.find(g => String(g.id) === String(id))
    ?? getMockGalleriesPage(1, 25, null).galleries[0];

  const photos: GalleryPhoto[] = Array.from({ length: 12 }).map((_, i) => ({
    id:       `${base.id}-p${i}`,
    imageUrl: `https://picsum.photos/seed/${base.id}-${i}/600/600`,
    caption:  `Photo ${i + 1} from ${base.title}`,
    tags:     [],
    emoji:    GALLERY_DEFAULT_EMOJI,
    bg:       base.bg,
  }));

  const related = getMockGalleriesPage(1, 25, null).galleries
    .filter(g => g.id !== base.id)
    .slice(0, 5);

  return {
    ...base,
    thumbnail:   photos[0].imageUrl,
    count:       photos.length,
    description: `A collection of ${photos.length} stunning photos from ${base.title}.`,
    keywords:    ['bollywood', 'celebrity', 'trending'],
    relatedGalleries: related,
    photos,
  };
}
```

- [ ] **Step 2: Run `cd mobile && npm run tsc` — verify no type errors.**

- [ ] **Step 3: Run `cd mobile && npm run lint` — verify no new lint errors.**

- [ ] **Step 4: Commit**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(galleries): add fetch functions with mock fallback"
```

---

## Task 4: Create `useGalleries` hook

**Files:**
- Create: `mobile/src/features/galleries/hooks/useGalleries.ts`

- [ ] **Step 1: Create the file with:**

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMediaGalleries, type GalleriesPage } from '../../../services/api';

const PAGE_SIZE = 25;

export function useGalleries(categoryId: number | null) {
  return useInfiniteQuery<GalleriesPage>({
    queryKey: ['galleries', categoryId ?? 'all'],
    queryFn: ({ pageParam = 1 }) =>
      fetchMediaGalleries(pageParam as number, PAGE_SIZE, categoryId),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/hooks/useGalleries.ts
git commit -m "feat(galleries): add useGalleries hook"
```

---

## Task 5: Create `useGalleryDetails` hook

**Files:**
- Create: `mobile/src/features/galleries/hooks/useGalleryDetails.ts`

- [ ] **Step 1: Create the file with:**

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchMediaGalleryDetails, type GalleryDetail } from '../../../services/api';

export function useGalleryDetails(id: string | number | undefined) {
  return useQuery<GalleryDetail | null>({
    queryKey: ['gallery-details', id],
    queryFn: () => fetchMediaGalleryDetails(id as string | number),
    enabled: id != null && id !== '',
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/hooks/useGalleryDetails.ts
git commit -m "feat(galleries): add useGalleryDetails hook"
```

---

## Task 6: Create `CategoryTabs` component

**Files:**
- Create: `mobile/src/features/galleries/components/CategoryTabs.tsx`

- [ ] **Step 1: Create the file with:**

```tsx
import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import type { GalleryCatTab } from '../../../services/api';

interface Props {
  tabs: GalleryCatTab[];
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
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
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
    borderBottomColor: '#E2E2E2',
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E2E2E2',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#D63636',
    borderColor: '#D63636',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/components/CategoryTabs.tsx
git commit -m "feat(galleries): add CategoryTabs component"
```

---

## Task 7: Create `GalleryCard` component

**Files:**
- Create: `mobile/src/features/galleries/components/GalleryCard.tsx`

- [ ] **Step 1: Create the file with:**

```tsx
import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Gallery } from '../../../services/api';

interface Props {
  gallery: Gallery;
  onPress: (g: Gallery) => void;
}

export default function GalleryCard({ gallery, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!gallery.thumbnail && !imgFailed;

  return (
    <Pressable
      onPress={() => onPress(gallery)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: gallery.bg }]}>
        {showImg ? (
          <Image
            source={{ uri: gallery.thumbnail! }}
            style={styles.img}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Text style={styles.emoji}>{gallery.emoji}</Text>
        )}
        <View style={styles.overlay} />
        <View style={styles.countBadge}>
          <Ionicons name="images-outline" size={9} color="#FFFFFF" />
          <Text style={styles.countText}>{gallery.count}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{gallery.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{gallery.time}</Text>
          {gallery.views ? (
            <View style={styles.viewsRow}>
              <Ionicons name="eye-outline" size={10} color="#8A8A8A" />
              <Text style={styles.views}>{gallery.views}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  pressed: { opacity: 0.8 },
  thumb: {
    position: 'relative',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { position: 'absolute', width: '100%', height: '100%' },
  emoji: { fontSize: 32 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  countBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  body: { padding: 8, gap: 4 },
  title: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: { fontSize: 10, color: '#8A8A8A' },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  views: { fontSize: 10, color: '#8A8A8A' },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/components/GalleryCard.tsx
git commit -m "feat(galleries): add GalleryCard component"
```

---

## Task 8: Create `GalleryHeroCard` component

**Files:**
- Create: `mobile/src/features/galleries/components/GalleryHeroCard.tsx`

- [ ] **Step 1: Create the file with:**

```tsx
import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Gallery } from '../../../services/api';

interface Props {
  gallery: Gallery;
  catLabel?: string | null;
  onPress: (g: Gallery) => void;
}

export default function GalleryHeroCard({ gallery, catLabel, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!gallery.thumbnail && !imgFailed;

  return (
    <Pressable
      onPress={() => onPress(gallery)}
      style={({ pressed }) => [styles.hero, { backgroundColor: gallery.bg }, pressed && styles.pressed]}
    >
      {showImg ? (
        <Image
          source={{ uri: gallery.thumbnail! }}
          style={styles.img}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text style={styles.emoji}>{gallery.emoji}</Text>
      )}
      <View style={styles.overlay} />
      <View style={styles.meta}>
        {catLabel ? <Text style={styles.cat}>{catLabel.toUpperCase()}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>{gallery.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="images-outline" size={11} color="rgba(255,255,255,0.82)" />
            <Text style={styles.metaText}>{gallery.count} photos</Text>
          </View>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{gallery.time}</Text>
        </View>
      </View>
      <View style={styles.viewBtn}>
        <Text style={styles.viewBtnText}>View Gallery</Text>
        <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginBottom: 14,
  },
  pressed: { opacity: 0.92 },
  img: { position: 'absolute', width: '100%', height: '100%' },
  emoji: { fontSize: 64 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  meta: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 44,
  },
  cat: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFD1D1',
    marginBottom: 5,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 19,
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.82)' },
  dot: { color: 'rgba(255,255,255,0.4)' },
  time: { fontSize: 11, color: 'rgba(255,255,255,0.62)' },
  viewBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  viewBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/components/GalleryHeroCard.tsx
git commit -m "feat(galleries): add GalleryHeroCard component"
```

---

## Task 9: Create `GallerySkeleton` component

**Files:**
- Create: `mobile/src/features/galleries/components/GallerySkeleton.tsx`

- [ ] **Step 1: Create the file with:**

```tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  count?: number;
}

export default function GallerySkeleton({ count = 6 }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]}>
          <View style={styles.thumb} />
          <View style={styles.body}>
            <View style={styles.line} />
            <View style={[styles.line, styles.lineShort]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  thumb: {
    aspectRatio: 4 / 3,
    backgroundColor: '#E8E8EA',
  },
  body: { padding: 8, gap: 6 },
  line: { height: 10, borderRadius: 4, backgroundColor: '#E8E8EA' },
  lineShort: { width: '55%' },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/components/GallerySkeleton.tsx
git commit -m "feat(galleries): add GallerySkeleton component"
```

---

## Task 10: Create `GalleriesScreen`

**Files:**
- Create: `mobile/src/features/galleries/screens/GalleriesScreen.tsx`

- [ ] **Step 1: Create the file with:**

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import type { HomeStackParamList } from '../../../navigation/types';
import { GALLERY_CAT_TABS, type Gallery } from '../../../services/api';

import CategoryTabs from '../components/CategoryTabs';
import GalleryCard from '../components/GalleryCard';
import GalleryHeroCard from '../components/GalleryHeroCard';
import GallerySkeleton from '../components/GallerySkeleton';
import { useGalleries } from '../hooks/useGalleries';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Galleries'>;

export default function GalleriesScreen() {
  const navigation = useNavigation<Nav>();
  const [activeCat, setActiveCat] = useState('all');
  const activeTab = GALLERY_CAT_TABS.find((t) => t.id === activeCat) || GALLERY_CAT_TABS[0];
  const isAll = activeCat === 'all';

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGalleries(activeTab.categoryId);

  const allGalleries = useMemo<Gallery[]>(
    () => (data?.pages || []).flatMap((p) => p.galleries),
    [data],
  );

  const pagination = data?.pages[data.pages.length - 1]?.pagination;
  const totalAlbums = pagination?.totalItems ?? allGalleries.length;
  const totalPages  = pagination?.totalPages ?? 1;

  const featured = !isAll ? (allGalleries.find(g => g.featured) || allGalleries[0]) : null;
  const gridItems = !isAll && featured
    ? allGalleries.filter(g => g.id !== featured.id)
    : allGalleries;

  const handlePress = (g: Gallery) => {
    navigation.navigate('GalleryDetail', { gallery: g });
  };

  const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}K+` : String(n));

  return (
    <View style={styles.screen}>
      <TopNavBack title="Galleries" onBack={() => navigation.goBack()} />
      <CategoryTabs
        tabs={GALLERY_CAT_TABS}
        active={activeCat}
        onChange={setActiveCat}
      />

      {isLoading ? (
        <GallerySkeleton count={6} />
      ) : isError ? (
        <ErrorState message="Couldn't load galleries" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={gridItems}
          keyExtractor={(g) => String(g.id)}
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <GalleryCard gallery={item} onPress={handlePress} />
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              {isAll ? (
                <View style={styles.statsRow}>
                  <Stat num={formatCount(totalAlbums)} label="Albums" />
                  <View style={styles.statDivider} />
                  <Stat num={String(allGalleries.length)} label="Loaded" />
                  <View style={styles.statDivider} />
                  <Stat num={String(totalPages)} label="Pages" />
                </View>
              ) : featured ? (
                <GalleryHeroCard
                  gallery={featured}
                  catLabel={activeTab.label}
                  onPress={handlePress}
                />
              ) : null}
              <Text style={styles.sectionLabel}>
                {isAll
                  ? 'ALL GALLERIES'
                  : `${activeTab.label.toUpperCase()} · ${formatCount(totalAlbums)} ALBUMS`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No galleries in this category yet.</Text>
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
                  {isFetchingNextPage ? 'Loading…' : 'Load More'}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F7' },
  listContent: { paddingBottom: 32 },
  gridRow: { gap: 10, paddingHorizontal: 12 },
  gridCell: { flex: 1, marginBottom: 10 },
  header: { paddingTop: 12 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#D63636' },
  statLabel: {
    fontSize: 9,
    color: '#8A8A8A',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statDivider: { width: 1, height: 28, backgroundColor: '#E2E2E2' },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 1,
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#D63636',
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8A8A8A', fontSize: 14 },
  loadMore: {
    marginHorizontal: 12,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E2E2',
    alignItems: 'center',
  },
  loadMoreText: { color: '#4A4A4A', fontWeight: '700', fontSize: 13 },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc` — expect an error like `Property 'Galleries'/'GalleryDetail' does not exist on HomeStackParamList`. That's expected; Task 11 fixes it.**

- [ ] **Step 3: Do NOT commit yet** — wait for Task 11 to register routes, then commit screen + nav changes together.

---

## Task 11: Register routes in navigation

**Files:**
- Modify: `mobile/src/navigation/types.ts` (lines 44–64)
- Modify: `mobile/src/navigation/HomeStack.tsx` (import list and `<Stack.Screen>` list)

- [ ] **Step 1: Open `mobile/src/navigation/types.ts` and replace the current `HomeStackParamList` block with:**

```ts
export type HomeStackParamList = {
  HomeMain: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CategoryFeed: { category: string };
  Celebrities: undefined;
  CelebrityProfile: { celebrity: import('../services/api').Celebrity };
  FanFiction: undefined;
  FanFictionDetail: { id: string };
  ChapterReader: { fanFictionId: string; chapterId: string };
  FanFictionAuthors: undefined;
  AuthorFollowers: { authorId: string };
  Videos: undefined;
  VideoDetail: { video: import('../services/api').Video };
  Shorts: undefined;
  WebStories: undefined;
  WebStoryPlayer: { id: string };
  Quizzes: undefined;
  QuizPlayer: { id: string };
  QuizResult: { id: string; score: number };
  QuizLeaderboard: { id: string };
  Galleries: undefined;
  GalleryDetail: { gallery: import('../services/api').Gallery };
};
```

- [ ] **Step 2: Open `mobile/src/navigation/HomeStack.tsx`. Add two imports after the existing feature imports (below the VideoDetailScreen import at line 10):**

```ts
import GalleriesScreen from '../features/galleries/screens/GalleriesScreen';
import GalleryDetailScreen from '../features/galleries/screens/GalleryDetailScreen';
```

- [ ] **Step 3: In the same file, add two `<Stack.Screen>` entries. Locate the `VideoDetail` entry (line 36) and insert after it:**

```tsx
        <Stack.Screen name="Galleries" component={GalleriesScreen} />
        <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
```

- [ ] **Step 4: `GalleryDetailScreen` does not exist yet — `tsc` will fail until Task 16. Create a placeholder stub at `mobile/src/features/galleries/screens/GalleryDetailScreen.tsx` so the nav compiles:**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TopNavBack } from '../../../components/layout/TopNavBar';

export default function GalleryDetailScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.screen}>
      <TopNavBack title="Gallery" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text>Gallery detail coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F7' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 5: Run `cd mobile && npm run tsc` — should pass now.**

- [ ] **Step 6: Run `cd mobile && npm run lint` — should pass.**

- [ ] **Step 7: Manual QA milestone** — run `cd mobile && npm start`, open in Expo Go or simulator, scroll to the Photo Galleries section on Home, tap **See All →** → *currently a no-op; will wire in Task 18*. For now, confirm the app still launches without errors.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/features/galleries/screens/GalleriesScreen.tsx \
        mobile/src/features/galleries/screens/GalleryDetailScreen.tsx \
        mobile/src/navigation/types.ts \
        mobile/src/navigation/HomeStack.tsx
git commit -m "feat(galleries): add GalleriesScreen and register routes"
```

---

## Task 12: Create `PhotoCell` component

**Files:**
- Create: `mobile/src/features/galleries/components/PhotoCell.tsx`

- [ ] **Step 1: Create the file with:**

```tsx
import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GalleryPhoto } from '../../../services/api';

interface Props {
  photo: GalleryPhoto;
  index: number;
  isFeatured: boolean;
  onPress: (index: number) => void;
}

export default function PhotoCell({ photo, index, isFeatured, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!photo.imageUrl && !imgFailed;

  return (
    <Pressable
      onPress={() => onPress(index)}
      style={({ pressed }) => [
        styles.cell,
        isFeatured && styles.featured,
        { backgroundColor: photo.bg },
        pressed && styles.pressed,
      ]}
    >
      {showImg ? (
        <Image
          source={{ uri: photo.imageUrl! }}
          style={styles.img}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text style={[styles.emoji, isFeatured && styles.emojiFeatured]}>
          {photo.emoji}
        </Text>
      )}
      <View style={styles.overlay} />
      <Text style={styles.num}>{index + 1}</Text>
      {photo.tags.length > 0 ? (
        <View style={styles.tagBadge}>
          <Ionicons name="person" size={8} color="#FFFFFF" />
          <Text style={styles.tagText}>{photo.tags.length}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    position: 'relative',
    flex: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featured: {
    aspectRatio: 1,
    borderRadius: 8,
  },
  pressed: { opacity: 0.85 },
  img: { position: 'absolute', width: '100%', height: '100%' },
  emoji: { fontSize: 26 },
  emojiFeatured: { fontSize: 44 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  num: {
    position: 'absolute',
    bottom: 4,
    right: 5,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  tagBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(53,88,240,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/components/PhotoCell.tsx
git commit -m "feat(galleries): add PhotoCell component"
```

---

## Task 13: Create `PhotoGrid` component

**Files:**
- Create: `mobile/src/features/galleries/components/PhotoGrid.tsx`

Design note: The prototype uses a 3-col CSS grid with the first photo spanning 2×2. React Native has no native grid-span — we implement it by rendering the first photo in one row of full width (≈2/3 of the container) next to a column of two smaller cells, then rendering the remaining photos in a plain 3-col flex grid below.

- [ ] **Step 1: Create the file with:**

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { GalleryPhoto } from '../../../services/api';
import PhotoCell from './PhotoCell';

interface Props {
  photos: GalleryPhoto[];
  onPhotoPress: (index: number) => void;
}

export default function PhotoGrid({ photos, onPhotoPress }: Props) {
  if (photos.length === 0) return null;

  const featured = photos[0];
  const rightPair = photos.slice(1, 3);
  const rest = photos.slice(3);

  return (
    <View style={styles.grid}>
      <View style={styles.topRow}>
        <View style={styles.featuredWrap}>
          <PhotoCell
            photo={featured}
            index={0}
            isFeatured={true}
            onPress={onPhotoPress}
          />
        </View>
        <View style={styles.rightCol}>
          {rightPair.map((p, i) => (
            <View key={String(p.id)} style={styles.smallWrap}>
              <PhotoCell
                photo={p}
                index={i + 1}
                isFeatured={false}
                onPress={onPhotoPress}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.restGrid}>
        {rest.map((p, i) => (
          <View key={String(p.id)} style={styles.restCell}>
            <PhotoCell
              photo={p}
              index={i + 3}
              isFeatured={false}
              onPress={onPhotoPress}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 6,
    paddingBottom: 6,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    gap: 4,
  },
  featuredWrap: {
    flex: 2,
    aspectRatio: 1,
  },
  rightCol: {
    flex: 1,
    gap: 4,
  },
  smallWrap: {
    flex: 1,
  },
  restGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  restCell: {
    width: '32.6%', // (100% - 2 * 4px gap) / 3 ≈ 32.6%
    aspectRatio: 1,
  },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/components/PhotoGrid.tsx
git commit -m "feat(galleries): add PhotoGrid with featured 2x2 cell"
```

---

## Task 14: Create `RelatedGalleryCard` component

**Files:**
- Create: `mobile/src/features/galleries/components/RelatedGalleryCard.tsx`

- [ ] **Step 1: Create the file with:**

```tsx
import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { Gallery } from '../../../services/api';

interface Props {
  gallery: Gallery;
  onPress: (g: Gallery) => void;
}

export default function RelatedGalleryCard({ gallery, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!gallery.thumbnail && !imgFailed;

  return (
    <Pressable
      onPress={() => onPress(gallery)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: gallery.bg }]}>
        {showImg ? (
          <Image
            source={{ uri: gallery.thumbnail! }}
            style={styles.img}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Text style={styles.emoji}>{gallery.emoji}</Text>
        )}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{gallery.count}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{gallery.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 120 },
  pressed: { opacity: 0.8 },
  thumb: {
    position: 'relative',
    width: 120,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  img: { position: 'absolute', width: '100%', height: '100%' },
  emoji: { fontSize: 24 },
  countBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countText: { color: '#FFFFFF', fontSize: 8, fontWeight: '700' },
  title: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 14,
  },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/components/RelatedGalleryCard.tsx
git commit -m "feat(galleries): add RelatedGalleryCard component"
```

---

## Task 15: Create `Lightbox` component

**Files:**
- Create: `mobile/src/features/galleries/components/Lightbox.tsx`

- [ ] **Step 1: Create the file with:**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GalleryPhoto } from '../../../services/api';

interface Props {
  visible: boolean;
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
}

const THUMB_SIZE = 46;

export default function Lightbox({ visible, photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [imgFailed, setImgFailed] = useState(false);
  const stripRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setImgFailed(false);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && stripRef.current) {
      stripRef.current.scrollTo({
        x: Math.max(0, index * (THUMB_SIZE + 5) - 120),
        animated: true,
      });
    }
  }, [index, visible]);

  if (!visible || photos.length === 0) return null;

  const photo = photos[index];
  const showImg = !!photo.imageUrl && !imgFailed;

  const change = (newIdx: number) => {
    setImgFailed(false);
    setIndex(newIdx);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.top}>
          <Text style={styles.counter}>{index + 1} / {photos.length}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={[styles.photoWrap, { backgroundColor: photo.bg }]}>
          {showImg ? (
            <Image
              source={{ uri: photo.imageUrl! }}
              style={styles.img}
              resizeMode="contain"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Text style={styles.emoji}>{photo.emoji}</Text>
          )}
          {index > 0 ? (
            <Pressable onPress={() => change(index - 1)} style={[styles.nav, styles.navPrev]}>
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </Pressable>
          ) : null}
          {index < photos.length - 1 ? (
            <Pressable onPress={() => change(index + 1)} style={[styles.nav, styles.navNext]}>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>

        {(photo.caption || photo.tags.length > 0) ? (
          <View style={styles.caption}>
            {photo.caption ? (
              <Text style={styles.captionText} numberOfLines={3}>{photo.caption}</Text>
            ) : null}
            {photo.tags.length > 0 ? (
              <View style={styles.tags}>
                {photo.tags.map((t) => (
                  <View key={String(t.id)} style={styles.tag}>
                    <Text style={styles.tagText}>{t.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <ScrollView
          ref={stripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {photos.map((p, i) => {
            const active = i === index;
            return (
              <Pressable
                key={String(p.id)}
                onPress={() => change(i)}
                style={[
                  styles.thumb,
                  { backgroundColor: p.bg },
                  active && styles.thumbActive,
                ]}
              >
                {p.imageUrl ? (
                  <Image source={{ uri: p.imageUrl }} style={styles.thumbImg} />
                ) : (
                  <Text style={styles.thumbEmoji}>{p.emoji}</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 48,
    paddingBottom: 8,
  },
  counter: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: {
    position: 'relative',
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 72 },
  nav: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPrev: { left: 8 },
  navNext: { right: 8 },
  caption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  captionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: 'rgba(53,88,240,0.7)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tagText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  strip: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 5,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: {
    opacity: 1,
    borderColor: '#3558F0',
    transform: [{ scale: 1.1 }],
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmoji: { fontSize: 18 },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/galleries/components/Lightbox.tsx
git commit -m "feat(galleries): add Lightbox modal with nav + strip"
```

---

## Task 16: Implement `GalleryDetailScreen`

**Files:**
- Modify: `mobile/src/features/galleries/screens/GalleryDetailScreen.tsx` (replace the Task 11 stub entirely)

- [ ] **Step 1: Replace the entire file contents with:**

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
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { HomeStackParamList } from '../../../navigation/types';
import type { Gallery } from '../../../services/api';

import PhotoGrid from '../components/PhotoGrid';
import RelatedGalleryCard from '../components/RelatedGalleryCard';
import Lightbox from '../components/Lightbox';
import { useGalleryDetails } from '../hooks/useGalleryDetails';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'GalleryDetail'>;
type Rt  = RouteProp<HomeStackParamList, 'GalleryDetail'>;

export default function GalleryDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const gallery = route.params.gallery;

  const { data: details, isLoading } = useGalleryDetails(gallery.id);

  const display = useMemo(() => ({ ...gallery, ...(details || {}) }), [gallery, details]);
  const photos = details?.photos ?? [];
  const count = details?.count ?? gallery.count;

  const [heroFailed, setHeroFailed] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const heroSrc = display.thumbnail && !heroFailed ? display.thumbnail : null;
  const shareUrl = display.pageUrl || `https://www.indiaforums.com/gallery/${display.id}`;

  const onShare = async () => {
    try {
      await Share.share({ message: `${display.title}\n${shareUrl}`, url: shareUrl });
    } catch {}
  };
  const onCopy = async () => {
    try { await Clipboard.setStringAsync(shareUrl); } catch {}
  };
  const openExt = (url: string) => Linking.openURL(url).catch(() => {});

  const onRelatedPress = (g: Gallery) => {
    navigation.push('GalleryDetail', { gallery: g });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color="#1A1A1A" />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerCat}>
            {(display.catLabel || 'Gallery').toUpperCase()}
          </Text>
          <Text style={styles.headerCount}>
            {count} photos{display.views ? ` · ${display.views} views` : ''}
          </Text>
        </View>
        <Pressable style={styles.headerBtn} onPress={onShare} hitSlop={8}>
          <Ionicons name="share-social-outline" size={17} color="#1A1A1A" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { backgroundColor: display.bg }]}>
          {heroSrc ? (
            <Image
              source={{ uri: heroSrc }}
              style={styles.heroImg}
              resizeMode="cover"
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <Text style={styles.heroEmoji}>{display.emoji}</Text>
          )}
          <View style={styles.heroScrim} />
          <View style={styles.heroMeta}>
            <Text style={styles.heroTitle} numberOfLines={2}>{display.title}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="images-outline" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroMetaText}>{count} photos</Text>
              </View>
              {display.views ? (
                <>
                  <Text style={styles.heroDot}>·</Text>
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="eye-outline" size={11} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.heroMetaText}>{display.views} views</Text>
                  </View>
                </>
              ) : null}
              <Text style={styles.heroDot}>·</Text>
              <Text style={styles.heroTime}>{display.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.shareRow}>
          <Text style={styles.shareLabel}>Share:</Text>
          <Pressable
            style={[styles.shareCircle, { backgroundColor: '#25D366' }]}
            onPress={() => openExt(`https://wa.me/?text=${encodeURIComponent(`${display.title} ${shareUrl}`)}`)}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={[styles.shareCircle, { backgroundColor: '#000000' }]}
            onPress={() => openExt(`https://twitter.com/intent/tweet?text=${encodeURIComponent(display.title)}&url=${encodeURIComponent(shareUrl)}`)}
          >
            <Text style={styles.xLogo}>X</Text>
          </Pressable>
          <Pressable
            style={[styles.shareCircle, { backgroundColor: '#1877F2' }]}
            onPress={() => openExt(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
          >
            <Ionicons name="logo-facebook" size={15} color="#FFFFFF" />
          </Pressable>
          <Pressable style={[styles.shareCircle, styles.copyBtn]} onPress={onCopy}>
            <Ionicons name="link-outline" size={15} color="#4A4A4A" />
          </Pressable>
        </View>

        {details && (details.description || details.keywords.length > 0) ? (
          <View style={styles.metaSection}>
            {details.description ? (
              <Text style={styles.description}>{details.description}</Text>
            ) : null}
            {details.keywords.length > 0 ? (
              <View style={styles.keywords}>
                {details.keywords.map((kw) => (
                  <View key={kw} style={styles.keyword}>
                    <Text style={styles.keywordText}>{kw}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {photos.length > 0 ? (
          <View style={styles.gridHeader}>
            <Text style={styles.gridLabel}>PHOTOS</Text>
            <Text style={styles.gridCount}>{photos.length} of {count}</Text>
          </View>
        ) : null}

        {photos.length > 0 ? (
          <PhotoGrid photos={photos} onPhotoPress={setLightboxIndex} />
        ) : null}

        {!isLoading && photos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={28} color="#8A8A8A" />
            <Text style={styles.emptyText}>No photos available</Text>
          </View>
        ) : null}

        {details?.relatedGalleries && details.relatedGalleries.length > 0 ? (
          <View style={styles.related}>
            <Text style={styles.relatedLabel}>MORE GALLERIES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedScroll}
            >
              {details.relatedGalleries.map((g) => (
                <RelatedGalleryCard key={String(g.id)} gallery={g} onPress={onRelatedPress} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.spacer} />
      </ScrollView>

      <Lightbox
        visible={lightboxIndex !== null}
        photos={photos}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEEFF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerCat: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#D63636',
  },
  headerCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  scroll: { paddingBottom: 32 },
  hero: {
    position: 'relative',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImg: { position: 'absolute', width: '100%', height: '100%' },
  heroEmoji: { fontSize: 56 },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroMeta: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 19,
    marginBottom: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroMetaText: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  heroDot: { color: 'rgba(255,255,255,0.35)' },
  heroTime: { fontSize: 10.5, color: 'rgba(255,255,255,0.6)' },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  shareLabel: { fontSize: 11, fontWeight: '700', color: '#8A8A8A' },
  shareCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtn: {
    backgroundColor: '#F5F6F7',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  xLogo: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  metaSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
    gap: 8,
  },
  description: {
    fontSize: 12.5,
    color: '#4A4A4A',
    lineHeight: 19,
  },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  keyword: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: 'rgba(53,88,240,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  keywordText: { fontSize: 10, fontWeight: '600', color: '#3558F0' },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 1,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#D63636',
  },
  gridCount: { fontSize: 10, color: '#8A8A8A', fontWeight: '500' },
  empty: { paddingVertical: 36, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 12, color: '#8A8A8A' },
  related: {
    paddingTop: 16,
    borderTopWidth: 6,
    borderTopColor: '#F5F6F7',
  },
  relatedLabel: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 1,
    marginHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#D63636',
  },
  relatedScroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  spacer: { height: 24 },
});
```

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Run `cd mobile && npm run lint`.**

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/galleries/screens/GalleryDetailScreen.tsx
git commit -m "feat(galleries): implement GalleryDetailScreen with photo grid + lightbox"
```

---

## Task 17: Wire HomeScreen — navigate to Galleries on tap

**Files:**
- Modify: `mobile/src/features/home/screens/HomeScreen.tsx` (lines 96–103)

- [ ] **Step 1: Open `mobile/src/features/home/screens/HomeScreen.tsx` and locate the `<PhotoGallerySection>` block at lines 97–103. Replace the two arrow-stub props:**

Old:
```tsx
          <PhotoGallerySection
            galleries={PREVIEW_GALLERIES}
            onSeeAll={() => {}}
            onGalleryPress={() => {}}
          />
```

New:
```tsx
          <PhotoGallerySection
            galleries={PREVIEW_GALLERIES}
            onSeeAll={() => navigation.navigate('Galleries')}
            onGalleryPress={(g) =>
              navigation.navigate('GalleryDetail', {
                gallery: {
                  id: g.id,
                  title: g.title,
                  pageUrl: null,
                  cat: null,
                  catLabel: null,
                  count: g.count,
                  emoji: g.emoji,
                  bg: g.bg,
                  time: '',
                  featured: false,
                  thumbnail: null,
                  viewCount: 0,
                  views: null,
                },
              })
            }
          />
```

Note: `PREVIEW_GALLERIES` is still the local static data and its shape (`{ id, title, emoji, bg, count }`) doesn't match the full `Gallery` type. The adapter above fills the missing fields with safe defaults — the detail screen will refetch the full gallery by id via the hook. The static preview is kept per the spec's "out of scope" note.

- [ ] **Step 2: Run `cd mobile && npm run tsc`.**

- [ ] **Step 3: Run `cd mobile && npm run lint`.**

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/home/screens/HomeScreen.tsx
git commit -m "feat(galleries): wire HomeScreen PhotoGallerySection to new routes"
```

---

## Task 18: Manual QA pass

No code changes — this is the final verification checkpoint.

- [ ] **Step 1: Start the app — `cd mobile && npm start`. Open in Expo Go or simulator.**

- [ ] **Step 2: Walk the flow:**
  - [ ] Home loads; scroll to "Photo Galleries" section.
  - [ ] Tap **See All →** → `GalleriesScreen` opens; "All" tab is active; stats row shows 3 stat items; 2-col grid populates with galleries (either real API or mock fallback on no network).
  - [ ] Tap a category pill (e.g. **Movies**) → active pill turns red; list re-fetches; hero card appears above the grid with red "MOVIES" label.
  - [ ] Tap a grid card → `GalleryDetailScreen` opens with title and count immediately visible.
  - [ ] Within a second or two, photo grid populates (first photo spans 2×2, rest fill 3-col).
  - [ ] Tap a photo → `Lightbox` opens at that index with counter "N / M".
  - [ ] Tap prev/next arrows → image changes, counter updates, thumbnail strip scrolls.
  - [ ] Tap close (×) → Lightbox dismisses.
  - [ ] Scroll to "MORE GALLERIES" → horizontal strip of related cards visible.
  - [ ] Tap a related card → new `GalleryDetailScreen` pushed; back button returns to previous.
  - [ ] Tap header share icon (top-right) → native Share sheet opens.
  - [ ] Tap WhatsApp/X/Facebook share circles → respective app opens (or web fallback if app not installed).
  - [ ] Tap Copy link → (no visible feedback but clipboard is set; paste to verify).
  - [ ] Back to Home → tap a specific gallery card in the preview strip (not "See All") → `GalleryDetail` opens with that gallery.
  - [ ] Enable airplane mode, re-open Galleries → mock fallback renders instead of an error screen.

- [ ] **Step 3: If any of the above fails, return to the relevant task, fix the issue, re-commit. If all pass, the feature is complete.**

- [ ] **Step 4: Final verification**

```bash
cd mobile && npm run tsc && npm run lint
```

Both should pass with no new errors or warnings attributable to the galleries feature.

---

## Self-review (completed inline)

**Spec coverage:**
- File structure (spec §1) → Tasks 4–16 create each file listed.
- API layer (spec §2) → Tasks 1–3 cover types, constants, transforms, fetches, mocks.
- Hooks (spec §3) → Tasks 4–5.
- GalleriesScreen layout (spec §4) → Task 10 (stats, hero, grid, load more, empty, skeleton, error).
- GalleryDetailScreen layout (spec §5) → Task 16 (sticky header, hero, share row, description+keywords, photo grid with 2×2 featured, related galleries).
- Lightbox (spec §5 sub-section) → Task 15.
- Navigation wiring (spec §6) → Task 11 (types + stack), Task 17 (HomeScreen).
- Styling (spec §7) → Each component task includes the full `StyleSheet.create` with the token palette from spec.
- Error handling edge cases (spec §8) → `onError` on Image in GalleryCard/HeroCard/RelatedGalleryCard/PhotoCell/Lightbox/Hero (Tasks 7, 8, 12, 14, 15, 16). Empty category in Task 10 `ListEmptyComponent`. Empty photos in Task 16. Mock fallback on `jsonData` parse error in Task 2 try/catch.
- Testing (spec §9) → Task 18 walks the manual QA checklist.

**Placeholder scan:** No TBD/TODO/"handle errors" placeholders. Every code block is complete.

**Type consistency:** `Gallery`, `GalleryPhoto`, `GalleryDetail`, `GalleriesPage`, `GalleryCatTab` defined in Task 1 and referenced identically throughout. `useGalleries(categoryId: number | null)` and `useGalleryDetails(id)` signatures consistent with consumer code in Tasks 10 and 16.

**Route parameter consistency:** `GalleryDetail: { gallery: Gallery }` declared in Task 11 types; read via `route.params.gallery` in Task 16; passed via `navigation.navigate('GalleryDetail', { gallery })` in Tasks 10, 14 (via `onRelatedPress` in Task 16), and 17.
