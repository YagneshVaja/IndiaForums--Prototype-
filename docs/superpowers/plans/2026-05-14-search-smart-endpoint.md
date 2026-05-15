# Search /search/smart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-endpoint search (`/search/suggest` + `/search/results`) with a single `/search/smart` flow, collapse SearchMain + SearchResults into one screen, and surface `trendingSearches` as the empty-state hero.

**Architecture:** One screen (`SearchScreen`) reads from a rewritten Zustand store that calls `searchApi.smart()` once per debounced keystroke or submit. The API returns server-grouped sections plus trending, so client-side grouping utilities and the two-stack navigation push disappear.

**Tech Stack:** React Native 0.83 / Expo 55 / TypeScript / Zustand / Axios / FlashList / NativeWind theme tokens / Ionicons.

**Spec:** `docs/superpowers/specs/2026-05-14-search-smart-endpoint-design.md`

---

## File map

**New:**
- `mobile/src/features/search/components/TrendingChips.tsx`

**Modify (rewrite contents):**
- `mobile/src/services/searchApi.ts`
- `mobile/src/store/searchStore.ts`
- `mobile/src/features/search/hooks/useEntityNavigator.ts`
- `mobile/src/features/search/components/ResultCard.tsx`
- `mobile/src/features/search/components/SuggestionSpotlight.tsx` → renamed `TopResultCard.tsx`
- `mobile/src/features/search/components/SuggestionSection.tsx` → renamed `SectionHeader.tsx`
- `mobile/src/features/search/utils/entityMetadata.ts`
- `mobile/src/features/search/screens/SearchMainScreen.tsx` → renamed `SearchScreen.tsx`
- `mobile/src/navigation/SearchStack.tsx`
- `mobile/src/navigation/types.ts`

**Delete:**
- `mobile/src/features/search/screens/SearchResultsScreen.tsx`
- `mobile/src/features/search/components/SuggestionRow.tsx`
- `mobile/src/features/search/components/SuggestionSkeleton.tsx`
- `mobile/src/features/search/components/BrowseTile.tsx`
- `mobile/src/features/search/utils/groupSuggestions.ts`

---

### Task 1: Replace `searchApi.ts` with smart-only client

**Files:**
- Modify: `mobile/src/services/searchApi.ts`

- [ ] **Step 1: Rewrite the file**

```ts
import { apiClient } from './api';

// ---------------------------------------------------------------------------
// DTOs — mirror the Smart Search OpenAPI schemas exactly.
// ---------------------------------------------------------------------------

export interface SmartSearchItemDto {
  itemId: number;
  title: string;
  pageUrl: string | null;
  updateChecksum: string | null;
  thumbnailUrl: string | null;
  contentType: string;       // 'Topics' | 'Articles' | 'People' | 'Videos' | 'Galleries' | 'Members' | 'Movies' | 'Shows' | 'Channels'
}

export interface SmartSearchSectionDto {
  section: string;           // human label echoed by API ('Topics', 'Articles', …)
  contentTypeId: number;     // 1=Article, 2=Movie, 3=Show, 4=Celebrity, 5=Video, 6=Gallery, 7=Channel, 8=Topic, 9=User
  items: SmartSearchItemDto[];
}

export interface SmartTrendingItemDto {
  query: string;
  searchCount: number;
}

export interface SmartSearchResponseDto {
  query: string;
  contentTypeId: number;
  sections: SmartSearchSectionDto[];
  trendingSearches: SmartTrendingItemDto[];
}

export interface SmartSearchParams {
  /** Empty / omitted → trending-only response. */
  query?: string;
  /** 0 = all sections (default), 1–9 = single section. */
  contentTypeId?: number;
}

/**
 * Smart search — single endpoint that powers typeahead, full results, and
 * trending. No query → trending-only. Query + contentTypeId=0 → up to 3 items
 * per section across all types. Query + contentTypeId 1–9 → only that section.
 */
export async function smart(
  { query, contentTypeId = 0 }: SmartSearchParams = {},
  signal?: AbortSignal,
): Promise<SmartSearchResponseDto> {
  const q = (query ?? '').trim();
  const res = await apiClient.get<SmartSearchResponseDto>('/search/smart', {
    params: {
      ...(q ? { query: q } : {}),
      contentTypeId,
    },
    signal,
  });
  return res.data;
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: errors confined to files we haven't migrated yet (store/searchStore.ts, useEntityNavigator.ts, ResultCard.tsx, SuggestionSpotlight.tsx, SearchMainScreen.tsx, SearchResultsScreen.tsx). No errors elsewhere.

- [ ] **Step 3: Do not commit yet** — the codebase won't compile cleanly until later tasks land. We commit once at the end of Task 11.

---

### Task 2: Map content types — extend `entityMetadata.ts`

**Background:** Smart returns plural strings (`"Topics"`, `"People"`, `"Galleries"`, `"Members"`) instead of the singular old enum (`"Topic"`, `"Person"`, etc.). Build a shared helper so every other file maps consistently.

**Files:**
- Modify: `mobile/src/features/search/utils/entityMetadata.ts`

- [ ] **Step 1: Rewrite the file**

```ts
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type EntityKind =
  | 'Article'
  | 'Movie'
  | 'Show'
  | 'Person'
  | 'Video'
  | 'Gallery'
  | 'Topic'
  | 'Forum'
  | 'Channel'
  | 'Member'
  | 'Unknown';

/**
 * Smart API contentType strings are plural ("Topics", "People", "Galleries",
 * "Members"). Older code paths use the singular form. Normalise once here so
 * every consumer can switch on a single canonical value.
 */
export function normalizeContentType(raw: string | null | undefined): EntityKind {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'article':
    case 'articles':
      return 'Article';
    case 'movie':
    case 'movies':
      return 'Movie';
    case 'show':
    case 'shows':
      return 'Show';
    case 'person':
    case 'people':
    case 'celebrity':
    case 'celebrities':
      return 'Person';
    case 'video':
    case 'videos':
      return 'Video';
    case 'gallery':
    case 'galleries':
    case 'photo':
    case 'photos':
      return 'Gallery';
    case 'topic':
    case 'topics':
      return 'Topic';
    case 'forum':
    case 'forums':
      return 'Forum';
    case 'channel':
    case 'channels':
      return 'Channel';
    case 'member':
    case 'members':
    case 'user':
    case 'users':
      return 'Member';
    default:
      return 'Unknown';
  }
}

const KIND_TO_CONTENT_TYPE_ID: Record<EntityKind, number | null> = {
  Article: 1,
  Movie: 2,
  Show: 3,
  Person: 4,
  Video: 5,
  Gallery: 6,
  Channel: 7,
  Topic: 8,
  Member: 9,
  Forum: null,    // Forums aren't a content type id in the smart API; they appear via Topic results
  Unknown: null,
};

export function contentTypeIdFor(kind: EntityKind): number | null {
  return KIND_TO_CONTENT_TYPE_ID[kind];
}

/**
 * Label used inside section headers, chip strips, and the metadata line
 * under a result title.
 */
export function entityLabel(kind: EntityKind): string {
  switch (kind) {
    case 'Article':  return 'Article';
    case 'Movie':    return 'Movie';
    case 'Show':     return 'TV Show';
    case 'Person':   return 'Celebrity';
    case 'Video':    return 'Video';
    case 'Gallery':  return 'Photo Gallery';
    case 'Topic':    return 'Forum Topic';
    case 'Forum':    return 'Forum';
    case 'Channel':  return 'Channel';
    case 'Member':   return 'Member';
    default:         return 'Item';
  }
}

/**
 * Plural label for section headers ("ARTICLES", "PEOPLE").
 */
export function entitySectionLabel(kind: EntityKind): string {
  switch (kind) {
    case 'Article':  return 'Articles';
    case 'Movie':    return 'Movies';
    case 'Show':     return 'Shows';
    case 'Person':   return 'People';
    case 'Video':    return 'Videos';
    case 'Gallery':  return 'Galleries';
    case 'Topic':    return 'Topics';
    case 'Forum':    return 'Forums';
    case 'Channel':  return 'Channels';
    case 'Member':   return 'Members';
    default:         return 'Other';
  }
}

export function entityIcon(kind: EntityKind): IoniconName {
  switch (kind) {
    case 'Movie':    return 'film';
    case 'Show':     return 'tv';
    case 'Person':   return 'person';
    case 'Article':  return 'newspaper';
    case 'Video':    return 'play-circle';
    case 'Gallery':  return 'images';
    case 'Topic':    return 'chatbubbles';
    case 'Forum':    return 'people-circle';
    case 'Channel':  return 'radio';
    case 'Member':   return 'person-circle';
    default:         return 'search';
  }
}

/**
 * Back-compat shim — the metadata line used to take entityType + summary.
 * Smart items don't have a summary, so this is just a relabel call.
 */
export function entityMetadataLine(contentType: string | null | undefined): string {
  return entityLabel(normalizeContentType(contentType));
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: same residual errors as before (in non-migrated files); no new errors in `entityMetadata.ts` or its importers.

Note: `entityIcon.ts` becomes a dead file after Task 4 finishes migrating consumers. Leave it in place until Task 11 deletes it together with the rest.

---

### Task 3: Rewrite `searchStore.ts`

**Files:**
- Modify: `mobile/src/store/searchStore.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { create } from 'zustand';
import { Platform } from 'react-native';
import type { MMKV } from 'react-native-mmkv';
import {
  smart as apiSmart,
  type SmartSearchSectionDto,
  type SmartTrendingItemDto,
} from '../services/searchApi';

// ---------------------------------------------------------------------------
// MMKV adapter — recents persistence, same shape as before.
// ---------------------------------------------------------------------------

type StorageAdapter = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
};

const memStore: Record<string, string> = {};
const fallback: StorageAdapter = {
  getString: (k) => memStore[k],
  set: (k, v) => { memStore[k] = v; },
  delete: (k) => { delete memStore[k]; },
};

function createStorage(): StorageAdapter {
  if (Platform.OS === 'web') return fallback;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV: (cfg: { id: string }) => MMKV;
    };
    return createMMKV({ id: 'search' }) as unknown as StorageAdapter;
  } catch {
    return fallback;
  }
}

const storage = createStorage();
const RECENTS_KEY = 'search.recents.v1';
const MAX_RECENTS = 10;

export interface RecentSearch {
  q: string;
  lastUsedAt: number;
}

function readRecents(): RecentSearch[] {
  const raw = storage.getString(RECENTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is RecentSearch =>
      x && typeof x.q === 'string' && typeof x.lastUsedAt === 'number',
    );
  } catch {
    return [];
  }
}

function writeRecents(list: RecentSearch[]): void {
  storage.set(RECENTS_KEY, JSON.stringify(list));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type SearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

interface SearchState {
  query: string;
  status: SearchStatus;
  sections: SmartSearchSectionDto[];
  trending: SmartTrendingItemDto[];
  activeContentTypeId: number | null;
  recents: RecentSearch[];

  setQuery: (q: string) => void;
  /** Update `query` without firing /smart. */
  setQueryQuiet: (q: string) => void;
  submit: (q: string) => Promise<void>;
  setFilter: (contentTypeId: number | null) => void;
  loadTrending: () => Promise<void>;
  fetchSmart: (q: string) => Promise<void>;

  addRecent: (q: string) => void;
  removeRecent: (q: string) => void;
  clearRecents: () => void;
}

let smartController: AbortController | null = null;
let smartDebounce: ReturnType<typeof setTimeout> | null = null;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  status: 'idle',
  sections: [],
  trending: [],
  activeContentTypeId: null,
  recents: readRecents(),

  setQuery: (q) => {
    set({ query: q });
    if (smartDebounce) clearTimeout(smartDebounce);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      smartController?.abort();
      smartController = null;
      // Reset to "input empty" view; trending stays as-is so the user sees it
      // again instantly when they clear the box.
      set({ sections: [], status: 'idle', activeContentTypeId: null });
      return;
    }
    set({ status: 'loading' });
    smartDebounce = setTimeout(() => {
      void get().fetchSmart(trimmed);
    }, 200);
  },

  setQueryQuiet: (q) => {
    smartController?.abort();
    smartController = null;
    set({ query: q, sections: [], status: 'idle' });
  },

  fetchSmart: async (q) => {
    smartController?.abort();
    const ctrl = new AbortController();
    smartController = ctrl;
    set({ status: 'loading' });
    try {
      const data = await apiSmart({ query: q, contentTypeId: 0 }, ctrl.signal);
      if (smartController !== ctrl) return;
      const isEmpty = data.sections.every((s) => s.items.length === 0);
      set({
        sections: data.sections,
        trending: data.trendingSearches.length > 0 ? data.trendingSearches : get().trending,
        status: isEmpty ? 'empty' : 'success',
      });
    } catch (e) {
      if (smartController !== ctrl) return;
      // Axios cancellation surfaces as ERR_CANCELED — that's not a UI error.
      const code = (e as { code?: string } | null)?.code;
      if (code === 'ERR_CANCELED' || code === 'CanceledError') return;
      set({ status: 'error' });
    }
  },

  submit: async (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (smartDebounce) clearTimeout(smartDebounce);
    set({ query: trimmed, activeContentTypeId: null });
    await get().fetchSmart(trimmed);
    if (get().status === 'success' || get().status === 'empty') {
      get().addRecent(trimmed);
    }
  },

  setFilter: (id) => {
    set({ activeContentTypeId: id });
  },

  loadTrending: async () => {
    // Only fetch trending on demand if we don't already have it cached
    // in-memory. Mount of SearchScreen calls this once per session.
    if (get().trending.length > 0) return;
    try {
      const data = await apiSmart({ contentTypeId: 0 });
      set({ trending: data.trendingSearches });
    } catch {
      // Empty-state trending is best-effort; don't surface an error UI.
    }
  },

  addRecent: (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const now = Date.now();
    const next: RecentSearch[] = [
      { q: trimmed, lastUsedAt: now },
      ...get().recents.filter((r) => r.q.toLowerCase() !== lower),
    ].slice(0, MAX_RECENTS);
    set({ recents: next });
    writeRecents(next);
  },

  removeRecent: (q) => {
    const lower = q.toLowerCase();
    const next = get().recents.filter((r) => r.q.toLowerCase() !== lower);
    set({ recents: next });
    writeRecents(next);
  },

  clearRecents: () => {
    set({ recents: [] });
    writeRecents([]);
  },
}));
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: errors remain only in the not-yet-migrated UI files (screens, ResultCard, SuggestionSpotlight, useEntityNavigator). No new errors elsewhere.

---

### Task 4: Rewrite `useEntityNavigator.ts` for `SmartSearchItemDto`

**Files:**
- Modify: `mobile/src/features/search/hooks/useEntityNavigator.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import type { SearchStackParamList } from '../../../navigation/types';
import type { SmartSearchItemDto } from '../../../services/searchApi';
import {
  fetchVideoDetails,
  type Celebrity,
  type Forum,
  type ForumTopic,
  type Movie,
} from '../../../services/api';
import type { UnsupportedEntitySheetHandle } from '../components/UnsupportedEntitySheet';
import { normalizeContentType, type EntityKind } from '../utils/entityMetadata';

type Nav = NativeStackNavigationProp<SearchStackParamList>;

function synthesizeCelebrity(item: SmartSearchItemDto): Celebrity {
  return {
    id: String(item.itemId),
    name: item.title,
    shortDesc: '',
    thumbnail: item.thumbnailUrl,
    pageUrl: item.pageUrl ?? '',
    shareUrl: item.pageUrl ? `https://www.indiaforums.com/${item.pageUrl}` : '',
    category: 'bollywood',
    rank: 0,
    prevRank: 0,
    trend: 'stable',
    rankDiff: 0,
  };
}

function synthesizeForumTopic(item: SmartSearchItemDto): ForumTopic {
  return {
    id: item.itemId,
    forumId: 0,
    forumName: '',
    forumThumbnail: null,
    title: item.title,
    description: '',
    poster: '',
    posterId: 0,
    lastBy: '',
    lastById: 0,
    time: '',
    lastTime: '',
    replies: 0,
    views: 0,
    likes: 0,
    userCount: 0,
    locked: false,
    pinned: false,
    flairId: 0,
    topicImage: item.thumbnailUrl,
    tags: [],
    linkTypeValue: '',
    poll: null,
  };
}

function synthesizeMovie(item: SmartSearchItemDto): Movie {
  return {
    titleId: item.itemId,
    titleName: item.title,
    startYear: null,
    pageUrl: item.pageUrl ?? '',
    posterUrl: item.thumbnailUrl,
    hasThumbnail: !!item.thumbnailUrl,
    releaseDate: null,
    titleShortDesc: null,
    titleTypeId: 0,
    audienceRating: 0,
    criticRating: 0,
    audienceRatingCount: 0,
    criticRatingCount: 0,
    averageRating: 0,
  };
}

function synthesizeForum(item: SmartSearchItemDto): Forum {
  return {
    id: item.itemId,
    name: item.title,
    description: '',
    categoryId: 0,
    slug: item.pageUrl ?? '',
    topicCount: 0,
    postCount: 0,
    followCount: 0,
    rank: 0,
    prevRank: 0,
    rankDisplay: '',
    bg: '',
    emoji: '',
    bannerUrl: null,
    thumbnailUrl: item.thumbnailUrl,
    locked: false,
    hot: false,
    priorityPosts: 0,
    editPosts: 0,
    deletePosts: 0,
  };
}

export interface UseEntityNavigator {
  sheetRef: React.MutableRefObject<UnsupportedEntitySheetHandle | null>;
  isResolving: boolean;
  openItem: (item: SmartSearchItemDto) => void;
}

export function useEntityNavigator(): UseEntityNavigator {
  const navigation = useNavigation<Nav>();
  const sheetRef = useRef<UnsupportedEntitySheetHandle | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const resolvingRef = useRef(false);

  const navigateNative = useCallback(
    async (item: SmartSearchItemDto) => {
      const kind: EntityKind = normalizeContentType(item.contentType);

      switch (kind) {
        case 'Article':
          navigation.push('ArticleDetail', {
            id: String(item.itemId),
            thumbnailUrl: item.thumbnailUrl ?? undefined,
            title: item.title,
          });
          return;
        case 'Gallery':
          navigation.push('GalleryDetail', {
            id: item.itemId,
            title: item.title,
            thumbnail: item.thumbnailUrl,
          });
          return;
        case 'Video': {
          if (resolvingRef.current) return;
          resolvingRef.current = true;
          setIsResolving(true);
          try {
            const detail = await fetchVideoDetails(String(item.itemId));
            if (!mountedRef.current) return;
            if (!detail) throw new Error('Video not found');
            navigation.push('VideoDetail', { video: detail });
          } catch {
            if (!mountedRef.current) return;
            sheetRef.current?.open({
              title: item.title,
              entityType: 'Video',
              imageUrl: item.thumbnailUrl,
              url: item.pageUrl,
            });
          } finally {
            resolvingRef.current = false;
            if (mountedRef.current) setIsResolving(false);
          }
          return;
        }
        case 'Person':
          navigation.push('CelebrityProfile', {
            celebrity: synthesizeCelebrity(item),
          });
          return;
        case 'Topic':
          navigation.push('TopicDetail', {
            topic: synthesizeForumTopic(item),
          });
          return;
        case 'Forum':
          navigation.push('ForumThread', {
            forum: synthesizeForum(item),
          });
          return;
        case 'Movie':
          navigation.push('MovieDetail', {
            movie: synthesizeMovie(item),
          });
          return;
        case 'Show':
        case 'Channel':
        case 'Member':
        case 'Unknown':
        default:
          sheetRef.current?.open({
            title: item.title,
            entityType: item.contentType,
            imageUrl: item.thumbnailUrl,
            url: item.pageUrl,
          });
      }
    },
    [navigation],
  );

  const openItem = useCallback(
    (item: SmartSearchItemDto) => {
      void Haptics.selectionAsync().catch(() => undefined);
      void navigateNative(item);
    },
    [navigateNative],
  );

  return { sheetRef, isResolving, openItem };
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: errors confined to ResultCard, SuggestionSpotlight, SearchMainScreen, SearchResultsScreen. None in `useEntityNavigator.ts`.

---

### Task 5: Adapt `ResultCard.tsx` for `SmartSearchItemDto`

**Files:**
- Modify: `mobile/src/features/search/components/ResultCard.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { SmartSearchItemDto } from '../../../services/searchApi';
import {
  entityIcon,
  entityLabel,
  normalizeContentType,
} from '../utils/entityMetadata';
import HighlightedText from './HighlightedText';

interface Props {
  item: SmartSearchItemDto;
  query: string;
  onPress: () => void;
}

export default function ResultCard({ item, query, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const kind = normalizeContentType(item.contentType);
  const meta = entityLabel(kind);

  // Topics/Forums/Members rarely have thumbnails; render them as text-first
  // cards with a circular icon badge so they don't look like broken images.
  const isTextEntity = kind === 'Topic' || kind === 'Forum' || kind === 'Member';
  const showThumbnail = !!item.thumbnailUrl;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${meta}: ${item.title}`}
    >
      {showThumbnail ? (
        <Image source={{ uri: item.thumbnailUrl! }} style={styles.thumb} contentFit="cover" />
      ) : isTextEntity ? (
        <View style={styles.iconBadge}>
          <Ionicons name={entityIcon(kind)} size={22} color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name={entityIcon(kind)} size={26} color={colors.primary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
        <HighlightedText
          text={item.title}
          match={query}
          style={styles.title}
          highlightStyle={styles.titleMatch}
          numberOfLines={2}
        />
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    thumb: { width: 56, height: 42, borderRadius: 8, backgroundColor: c.surface },
    thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    meta: { fontSize: 11, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    title: { fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 19 },
    titleMatch: { fontWeight: '800', color: c.text },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: errors confined to SuggestionSpotlight, SearchMainScreen, SearchResultsScreen.

---

### Task 6: Rename `SuggestionSpotlight.tsx` → `TopResultCard.tsx`

**Files:**
- Create: `mobile/src/features/search/components/TopResultCard.tsx`
- Delete: `mobile/src/features/search/components/SuggestionSpotlight.tsx` (deferred to Task 11)

- [ ] **Step 1: Create `TopResultCard.tsx`**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { SmartSearchItemDto } from '../../../services/searchApi';
import {
  entityIcon,
  entityLabel,
  normalizeContentType,
} from '../utils/entityMetadata';
import HighlightedText from './HighlightedText';

interface Props {
  item: SmartSearchItemDto;
  query: string;
  onPress: () => void;
}

export default function TopResultCard({ item, query, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const kind = normalizeContentType(item.contentType);
  const meta = entityLabel(kind);

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>TOP RESULT</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open top result ${item.title}`}
      >
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name={entityIcon(kind)} size={28} color={colors.primary} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
          <HighlightedText
            text={item.title}
            match={query}
            style={styles.phrase}
            highlightStyle={styles.phraseMatch}
            numberOfLines={2}
          />
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
    kicker: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 1,
      marginBottom: 6,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardPressed: { opacity: 0.85 },
    thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: c.bg },
    thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft },
    body: { flex: 1, gap: 4 },
    meta: { fontSize: 10, fontWeight: '700', color: c.primary, letterSpacing: 0.5 },
    phrase: { fontSize: 16, fontWeight: '700', color: c.text, lineHeight: 21 },
    phraseMatch: { fontWeight: '900', color: c.text },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: SuggestionSpotlight still errors (will be deleted in Task 11) — that's fine. No new errors in TopResultCard.

---

### Task 7: Create `SectionHeader.tsx` (replaces `SuggestionSection.tsx`)

**Files:**
- Create: `mobile/src/features/search/components/SectionHeader.tsx`
- Delete: `mobile/src/features/search/components/SuggestionSection.tsx` (deferred to Task 11)

- [ ] **Step 1: Create `SectionHeader.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import {
  entitySectionLabel,
  normalizeContentType,
} from '../utils/entityMetadata';

interface Props {
  /** Either the raw `section` string from the API or a singular EntityKind. */
  label: string;
}

export default function SectionHeader({ label }: Props) {
  const styles = useThemedStyles(makeStyles);
  const kind = normalizeContentType(label);
  const text = kind === 'Unknown' ? label : entitySectionLabel(kind);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{text.toUpperCase()}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 4,
      backgroundColor: c.bg,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.8,
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: same residual errors as before.

---

### Task 8: Create `TrendingChips.tsx`

**Files:**
- Create: `mobile/src/features/search/components/TrendingChips.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { SmartTrendingItemDto } from '../../../services/searchApi';

interface Props {
  trending: SmartTrendingItemDto[];
  onPress: (query: string) => void;
}

export default function TrendingChips({ trending, onPress }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeStore((s) => s.colors);
  if (trending.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={14} color={colors.primary} />
        <Text style={styles.kicker}>TRENDING NOW</Text>
      </View>
      <View style={styles.chips}>
        {trending.map((t) => (
          <Pressable
            key={t.query}
            onPress={() => onPress(t.query)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Search for ${t.query}`}
          >
            <Text style={styles.chipText}>{t.query}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 8, gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    kicker: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 1,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipPressed: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: c.text },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: same residual errors only in not-yet-migrated screen files.

---

### Task 9: Rewrite `SearchMainScreen.tsx` as the single `SearchScreen.tsx`

**Background:** This screen now handles four states (empty / typing / loaded / error) and absorbs every responsibility `SearchResultsScreen.tsx` had. Submit no longer navigates.

**Files:**
- Create: `mobile/src/features/search/screens/SearchScreen.tsx`
- Delete: `mobile/src/features/search/screens/SearchMainScreen.tsx` (deferred to Task 11)

- [ ] **Step 1: Create the new file**

```tsx
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';

import { useSearchStore } from '../../../store/searchStore';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { SmartSearchItemDto, SmartSearchSectionDto } from '../../../services/searchApi';

import SearchInputHeader from '../components/SearchInputHeader';
import EntityTypeChip from '../components/EntityTypeChip';
import ResultCard from '../components/ResultCard';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import SectionHeader from '../components/SectionHeader';
import TopResultCard from '../components/TopResultCard';
import TrendingChips from '../components/TrendingChips';
import RecentRow from '../components/RecentRow';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import { useEntityNavigator } from '../hooks/useEntityNavigator';
import { useNotificationBell } from '../../../hooks/useNotificationBell';

type Row =
  | { kind: 'top'; item: SmartSearchItemDto }
  | { kind: 'section'; label: string }
  | { kind: 'item'; item: SmartSearchItemDto };

export default function SearchScreen() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const submit = useSearchStore((s) => s.submit);
  const status = useSearchStore((s) => s.status);
  const sections = useSearchStore((s) => s.sections);
  const trending = useSearchStore((s) => s.trending);
  const activeContentTypeId = useSearchStore((s) => s.activeContentTypeId);
  const setFilter = useSearchStore((s) => s.setFilter);
  const loadTrending = useSearchStore((s) => s.loadTrending);
  const recents = useSearchStore((s) => s.recents);
  const removeRecent = useSearchStore((s) => s.removeRecent);
  const clearRecents = useSearchStore((s) => s.clearRecents);

  const { sheetRef, openItem } = useEntityNavigator();
  const { notifCount, openNotifications } = useNotificationBell();

  useEffect(() => {
    void loadTrending();
  }, [loadTrending]);

  const handleSubmit = useCallback((q: string) => { void submit(q); }, [submit]);
  const handleTrendingPress = useCallback((q: string) => { void submit(q); }, [submit]);

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;

  // Filtered sections used by the chip strip + the rendered list.
  const filteredSections = useMemo<SmartSearchSectionDto[]>(() => {
    if (activeContentTypeId == null) return sections;
    return sections.filter((s) => s.contentTypeId === activeContentTypeId);
  }, [sections, activeContentTypeId]);

  const rows = useMemo<Row[]>(() => {
    if (!hasQuery || filteredSections.length === 0) return [];
    const out: Row[] = [];
    const firstSection = filteredSections[0];
    const firstItem = firstSection?.items[0];

    // Top Result only when no chip filter is active and the first section has at least one item.
    if (activeContentTypeId == null && firstItem) {
      out.push({ kind: 'top', item: firstItem });
    }

    for (let i = 0; i < filteredSections.length; i++) {
      const section = filteredSections[i];
      const items = (i === 0 && activeContentTypeId == null)
        ? section.items.slice(1)   // first item is already the Top Result
        : section.items;
      if (items.length === 0) continue;
      out.push({ kind: 'section', label: section.section });
      for (const item of items) out.push({ kind: 'item', item });
    }
    return rows_dedup(out);
  }, [filteredSections, activeContentTypeId, hasQuery]);

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQuery}
        onSubmit={handleSubmit}
        autoFocus
        trailingIcon={{
          name: 'notifications-outline',
          onPress: openNotifications,
          badge: notifCount,
          accessibilityLabel: 'Notifications',
        }}
      />

      {hasQuery && sections.length > 0 ? (
        <View style={styles.chipStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStrip}
            keyboardShouldPersistTaps="handled"
          >
            <EntityTypeChip
              label="All"
              active={activeContentTypeId == null}
              onPress={() => setFilter(null)}
            />
            {sections.map((s) => (
              <EntityTypeChip
                key={s.contentTypeId}
                label={s.section}
                active={activeContentTypeId === s.contentTypeId}
                onPress={() => setFilter(s.contentTypeId)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.body}>
        {/* Loading skeletons */}
        {hasQuery && status === 'loading' && sections.length === 0 ? (
          <View>
            {Array.from({ length: 5 }, (_, i) => <ResultCardSkeleton key={i} />)}
          </View>
        ) : null}

        {/* Error */}
        {hasQuery && status === 'error' ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.textTertiary} />
            <Text style={styles.errorTitle}>Couldn't load search</Text>
            <Pressable
              onPress={() => setQuery(query)}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry search"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Empty results */}
        {hasQuery && status !== 'loading' && status !== 'error' && rows.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              No {activeContentTypeId != null ? sectionLabelFor(filteredSections, activeContentTypeId) + ' ' : ''}results for "{trimmed}"
            </Text>
            <Text style={styles.emptyBody}>
              Try a different spelling or remove filters.
            </Text>
          </View>
        ) : null}

        {/* Loaded rows */}
        {hasQuery && rows.length > 0 ? (
          <FlashList<Row>
            data={rows}
            keyExtractor={(row, i) => {
              if (row.kind === 'top') return `top-${row.item.itemId}`;
              if (row.kind === 'section') return `sec-${row.label}-${i}`;
              return `item-${row.item.itemId}-${i}`;
            }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.kind === 'top') {
                return (
                  <TopResultCard
                    item={item.item}
                    query={query}
                    onPress={() => openItem(item.item)}
                  />
                );
              }
              if (item.kind === 'section') {
                return <SectionHeader label={item.label} />;
              }
              return (
                <ResultCard
                  item={item.item}
                  query={query}
                  onPress={() => openItem(item.item)}
                />
              );
            }}
          />
        ) : null}

        {/* Empty input — Trending + Recents */}
        {!hasQuery ? (
          <FlatList
            data={recents}
            keyExtractor={(r) => r.q}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                <TrendingChips trending={trending} onPress={handleTrendingPress} />
                {recents.length > 0 ? (
                  <View style={styles.recentsHeader}>
                    <Text style={styles.recentsTitle}>Recent searches</Text>
                    <Pressable
                      onPress={clearRecents}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear all recent searches"
                    >
                      <Text style={styles.clearText}>Clear</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <RecentRow
                q={item.q}
                onPress={() => handleSubmit(item.q)}
                onRemove={() => removeRecent(item.q)}
              />
            )}
          />
        ) : null}
      </View>

      <UnsupportedEntitySheet ref={sheetRef} />
    </View>
  );
}

function sectionLabelFor(
  sections: SmartSearchSectionDto[],
  id: number,
): string {
  const match = sections.find((s) => s.contentTypeId === id);
  return match ? match.section.toLowerCase() : '';
}

/** Defensive dedup: API can occasionally emit the same itemId across sections. */
function rows_dedup(rows: Row[]): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of rows) {
    if (r.kind === 'top' || r.kind === 'item') {
      const key = `${r.item.contentType}-${r.item.itemId}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(r);
  }
  return out;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    body: { flex: 1 },
    chipStripWrap: {
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    chipStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    recentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 16,
      paddingBottom: 6,
    },
    recentsTitle: {
      fontSize: 12, fontWeight: '700', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.6,
    },
    clearText: { fontSize: 12, fontWeight: '600', color: c.primary },
    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 10, paddingHorizontal: 32, paddingTop: 48,
    },
    errorTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    retryBtn: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 10, backgroundColor: c.primarySoft,
    },
    retryText: { fontSize: 13, fontWeight: '700', color: c.primary },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: c.text, textAlign: 'center' },
    emptyBody: {
      fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18,
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npm run tsc`
Expected: errors only in `SearchMainScreen.tsx` and `SearchResultsScreen.tsx` (still importing removed APIs) — both files will be deleted in Task 11.

---

### Task 10: Wire `SearchScreen` into the stack

**Files:**
- Modify: `mobile/src/navigation/SearchStack.tsx`
- Modify: `mobile/src/navigation/types.ts`

- [ ] **Step 1: Update `types.ts`**

Replace the `SearchStackParamList` block (lines 167–186 currently) with:

```ts
export type SearchStackParamList = {
  SearchMain: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CelebrityProfile: { celebrity: import('../services/api').Celebrity };
  VideoDetail: { video: import('../services/api').Video };
  GalleryDetail:
    | { gallery: import('../services/api').Gallery }
    | { id: string | number; title?: string; thumbnail?: string | null };
  ForumThread: { forum: import('../services/api').Forum };
  TopicDetail:
    | {
        topic: import('../services/api').ForumTopic;
        forum?: import('../services/api').Forum;
        jumpToLast?: boolean;
        autoAction?: 'like' | 'reply' | 'quote';
      }
    | { topicId: string; forumId?: string; focusPostId?: string };
  MovieDetail: { movie: import('../services/api').Movie };
};
```

(Only change: `SearchResults: undefined` is removed.)

- [ ] **Step 2: Update `SearchStack.tsx`**

Replace the file contents:

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SearchStackParamList } from './types';

import SearchScreen from '../features/search/screens/SearchScreen';
import ArticleDetailScreen from '../features/news/screens/ArticleDetailScreen';
import CelebrityDetailScreen from '../features/celebrities/screens/CelebrityDetailScreen';
import VideoDetailScreen from '../features/videos/screens/VideoDetailScreen';
import GalleryDetailScreen from '../features/galleries/screens/GalleryDetailScreen';
import TopicDetailScreen from '../features/forums/screens/TopicDetailScreen';
import ForumThreadScreen from '../features/forums/screens/ForumThreadScreen';
import MovieDetailScreen from '../features/movies/screens/MovieDetailScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="CelebrityProfile" component={CelebrityDetailScreen} />
      <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
      <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
      <Stack.Screen name="ForumThread" component={ForumThreadScreen} />
      <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd mobile && npm run tsc`
Expected: errors only in the to-be-deleted `SearchMainScreen.tsx`, `SearchResultsScreen.tsx`, `SuggestionSpotlight.tsx`, `SuggestionRow.tsx`, `SuggestionSection.tsx`, `BrowseTile.tsx`, `SuggestionSkeleton.tsx`, `groupSuggestions.ts`, `entityIcon.ts` (if no longer imported elsewhere).

---

### Task 11: Delete dead files and verify clean type-check

**Files to delete:**
- `mobile/src/features/search/screens/SearchMainScreen.tsx`
- `mobile/src/features/search/screens/SearchResultsScreen.tsx`
- `mobile/src/features/search/components/SuggestionSpotlight.tsx`
- `mobile/src/features/search/components/SuggestionRow.tsx`
- `mobile/src/features/search/components/SuggestionSection.tsx`
- `mobile/src/features/search/components/SuggestionSkeleton.tsx`
- `mobile/src/features/search/components/BrowseTile.tsx`
- `mobile/src/features/search/utils/groupSuggestions.ts`
- `mobile/src/features/search/utils/entityIcon.ts` (only if no remaining importers — verify with grep first)
- `mobile/src/features/search/components/ResultsContextLine.tsx` (no longer referenced — verify with grep)

- [ ] **Step 1: Verify nothing else imports the files to be deleted**

Run (PowerShell):
```
Select-String -Path mobile\src\**\*.ts*,mobile\src\**\*.tsx -Pattern 'SuggestionSpotlight|SuggestionRow|SuggestionSection|SuggestionSkeleton|BrowseTile|groupSuggestions|SearchResultsScreen|SearchMainScreen|ResultsContextLine|entityIcon' -SimpleMatch
```
Expected: only matches are the files themselves (self-references). If a non-deletion file still imports any of these names, fix that import to point at the new equivalent before deleting.

- [ ] **Step 2: Delete the files**

Run (PowerShell):
```powershell
Remove-Item mobile/src/features/search/screens/SearchMainScreen.tsx
Remove-Item mobile/src/features/search/screens/SearchResultsScreen.tsx
Remove-Item mobile/src/features/search/components/SuggestionSpotlight.tsx
Remove-Item mobile/src/features/search/components/SuggestionRow.tsx
Remove-Item mobile/src/features/search/components/SuggestionSection.tsx
Remove-Item mobile/src/features/search/components/SuggestionSkeleton.tsx
Remove-Item mobile/src/features/search/components/BrowseTile.tsx
Remove-Item mobile/src/features/search/utils/groupSuggestions.ts
```

(Only delete `entityIcon.ts` and `ResultsContextLine.tsx` if Step 1 confirmed they have zero remaining importers.)

- [ ] **Step 3: Type-check should now be clean**

Run: `cd mobile && npm run tsc`
Expected: zero errors.

- [ ] **Step 4: Lint**

Run: `cd mobile && npm run lint`
Expected: zero errors. Fix any warnings introduced by new files (unused imports, missing deps in hooks).

---

### Task 12: Manual smoke test

- [ ] **Step 1: Start Metro**

Run: `cd mobile && npm run start`

- [ ] **Step 2: Verify on device / simulator**

Walk through these checks. Each must pass:

1. **Empty input** — open Search tab. Expect: "TRENDING NOW" chip cloud (from `/search/smart` no-query call); below it, "Recent searches" if you have any.
2. **Tap a trending chip** — expect: input fills with that query, results render, chip filter shows `All` + each section, recents gets a new entry.
3. **Type "salman"** — expect: 200ms debounce, then TOP RESULT card + sections (Topics, Articles, People, Videos, Galleries, Members in server order). Each section caps at 3 items.
4. **Tap chip "People"** — expect: instant filter to only People rows (no Top Result), no network call.
5. **Tap chip "All"** — expect: full set returns instantly.
6. **Tap a Person row** — expect: CelebrityProfile pushes; back gesture returns to Search with sections intact.
7. **Tap a Topic row** — expect: TopicDetail pushes; back returns to Search.
8. **Tap an Article row** — expect: ArticleDetail pushes; thumbnail visible.
9. **Tap a Member row** — expect: UnsupportedEntitySheet opens (we don't have a member profile route from Search yet).
10. **Type "xyzqqq" (no results)** — expect: empty state copy "No results for "xyzqqq"".
11. **Airplane mode + retype** — expect: error state with Retry button; tap Retry recovers when network returns.
12. **Clear input** — expect: back to trending + recents instantly.

- [ ] **Step 3: Commit everything as one feature commit**

```bash
git add mobile/src/services/searchApi.ts \
        mobile/src/store/searchStore.ts \
        mobile/src/features/search/hooks/useEntityNavigator.ts \
        mobile/src/features/search/utils/entityMetadata.ts \
        mobile/src/features/search/components/ResultCard.tsx \
        mobile/src/features/search/components/TopResultCard.tsx \
        mobile/src/features/search/components/SectionHeader.tsx \
        mobile/src/features/search/components/TrendingChips.tsx \
        mobile/src/features/search/screens/SearchScreen.tsx \
        mobile/src/navigation/SearchStack.tsx \
        mobile/src/navigation/types.ts \
        docs/superpowers/specs/2026-05-14-search-smart-endpoint-design.md \
        docs/superpowers/plans/2026-05-14-search-smart-endpoint.md

# Stage deletions
git add -u mobile/src/features/search/

git commit -m "feat(mobile): adopt /search/smart single-endpoint search"
```

(Confirm with the user before running the commit — the memory note `feedback_always_ask_before_commit` requires explicit approval.)

---

## Self-review

**Spec coverage** — every spec section maps to a task:
- §"API surface" → Task 1
- §"Store shape" → Task 3
- §"Screen states" A/B/C/D → Task 9
- §"Entity navigation" → Task 4
- §"File-level changes" table → covered across Tasks 1–11
- §"Verification" → Task 12

**Placeholder scan** — no TBDs, all code blocks complete, type signatures consistent across tasks (e.g. `openItem`, `SmartSearchItemDto`, `EntityKind` all match between files).

**Type consistency** — `openItem` is used in Task 4 (definition) and Task 9 (call site); `normalizeContentType` defined in Task 2 and consumed in Tasks 4/5/6/7; `setFilter`/`activeContentTypeId` shape matches between Task 3 (store) and Task 9 (screen).

**Ordering rationale** — API + store + utils precede UI to keep dependency direction one-way. Deletions are deferred to Task 11 so we never have a half-broken tree mid-task. Single commit at the very end avoids the awkward intermediate state.
