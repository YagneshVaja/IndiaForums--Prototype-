# Mobile Search Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Search tab in `mobile/` with a production-grade search experience backed by the Smart Search API (`/api/v1/search/{suggest,results,click}`).

**Architecture:** New `searchApi.ts` thin client + Zustand `searchStore` (with MMKV-backed recent searches) + two new screens (`SearchMainScreen`, `SearchResultsScreen`) + a `useEntityNavigator` hook that routes results to existing native detail screens (Article, Gallery, Video, Person) or opens an `UnsupportedEntitySheet` (Topic, Forum, Movie, Show) that links out to the public web URL.

**Tech Stack:** React Native, Expo, TypeScript, Zustand, `@react-navigation/native-stack`, `@gorhom/bottom-sheet`, `expo-image`, `expo-haptics`, `react-native-mmkv`, `@shopify/flash-list`, axios via existing `apiClient`.

**Spec:** [docs/superpowers/specs/2026-04-29-mobile-search-tab-design.md](../specs/2026-04-29-mobile-search-tab-design.md)

**Verification model (no unit tests):** `mobile/` has `jest` declared but no test files and no jest config — existing features (Videos, Celebrities, Galleries) ship without tests. Each task's verification gate is:
1. `cd mobile && npm run tsc` passes (no type errors).
2. `cd mobile && npm run lint` passes (no new lint errors).
3. Manual smoke check at milestone tasks (Task 9, Task 12).

---

## File map

**New:**
- `mobile/src/services/searchApi.ts`
- `mobile/src/store/searchStore.ts`
- `mobile/src/features/search/screens/SearchMainScreen.tsx`
- `mobile/src/features/search/screens/SearchResultsScreen.tsx`
- `mobile/src/features/search/components/SearchInputHeader.tsx`
- `mobile/src/features/search/components/SuggestionRow.tsx`
- `mobile/src/features/search/components/RecentRow.tsx`
- `mobile/src/features/search/components/EntityTypeChip.tsx`
- `mobile/src/features/search/components/ResultCard.tsx`
- `mobile/src/features/search/components/UnsupportedEntitySheet.tsx`
- `mobile/src/features/search/hooks/useEntityNavigator.ts`

**Modified:**
- `mobile/src/navigation/types.ts` — fix `SearchStackParamList` to mirror real screens.
- `mobile/src/navigation/SearchStack.tsx` — replace placeholders, register all routes used by the entity navigator.

---

## Entity-routing decision (locked for v1)

| `entityType` | Action on tap |
|---|---|
| `Article` | `navigation.push('ArticleDetail', { id: String(entityId) })` |
| `Gallery` | `navigation.push('GalleryDetail', { id: entityId, title, thumbnail: imageUrl })` |
| `Video` | Fetch via `fetchVideoDetails(String(entityId))`, then push `VideoDetail` with the resolved `Video`. |
| `Person` | Synthesize a minimal `Celebrity` stub from the search payload, push `CelebrityProfile`. (Existing screen self-fetches biography + fans by id, so the stub only feeds the header.) |
| `Topic` / `Forum` / `Movie` / `Show` / unknown | Open `UnsupportedEntitySheet` → `Linking.openURL('https://www.indiaforums.com/' + url)` |

Click tracking (`POST /search/click`) fires fire-and-forget on results-screen taps **only** (suggest taps don't get a `searchLogId`).

---

## Task 1: Add the search API client

**Files:**
- Create: `mobile/src/services/searchApi.ts`

- [ ] **Step 1: Create `mobile/src/services/searchApi.ts` with the following content:**

```ts
import { apiClient } from './api';

// ---------------------------------------------------------------------------
// DTOs — mirror the Smart Search OpenAPI schemas exactly.
// ---------------------------------------------------------------------------

export interface SuggestItemDto {
  phrase: string;
  entityType: string | null;
  entityId: number | null;
  url: string | null;
  imageUrl: string | null;
  weight: number;
}

export interface SuggestResponseDto {
  query: string;
  suggestions: SuggestItemDto[];
}

export interface SearchResultItemDto {
  entityType: string;
  entityId: number;
  title: string;
  summary: string | null;
  url: string | null;
  imageUrl: string | null;
  score: number;
}

export interface SearchResultsResponseDto {
  query: string;
  searchLogId: number | null;
  results: SearchResultItemDto[];
}

export interface TrackSearchClickResponseDto {
  success: boolean;
  suggestionLearned: boolean;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/**
 * Fast typeahead. No logging server-side. Returns up to 10 weight-ordered
 * suggestions. Pass the AbortSignal so older requests are cancelled when
 * the user keeps typing.
 */
export async function suggest(
  q: string,
  signal?: AbortSignal,
): Promise<SuggestResponseDto> {
  const trimmed = q.trim();
  if (!trimmed) return { query: '', suggestions: [] };
  const res = await apiClient.get<SuggestResponseDto>('/search/suggest', {
    params: { q: trimmed },
    signal,
  });
  return res.data;
}

export interface SearchResultsParams {
  q: string;
  entityType?: string | null;
  page?: number;
  pageSize?: number;
}

/**
 * Full scored results. Returns up to 50 items + a `searchLogId` used by
 * `trackClick` for learning. Live API currently returns the same payload
 * for page 1 and page 2 — we still send `page` so this client doesn't
 * need restructuring once pagination is fixed server-side.
 */
export async function searchResults(
  { q, entityType, page = 1, pageSize = 50 }: SearchResultsParams,
  signal?: AbortSignal,
): Promise<SearchResultsResponseDto> {
  const trimmed = q.trim();
  if (!trimmed) return { query: '', searchLogId: null, results: [] };
  const res = await apiClient.get<SearchResultsResponseDto>('/search/results', {
    params: {
      q: trimmed,
      ...(entityType ? { entityType } : {}),
      page,
      pageSize,
    },
    signal,
  });
  return res.data;
}

export interface TrackSearchClickArgs {
  searchLogId: number;
  entityType: string;
  entityId: number;
}

/**
 * Fire-and-forget click tracker. Caller does not await this — search
 * navigation must feel instant.
 */
export async function trackClick(
  args: TrackSearchClickArgs,
): Promise<TrackSearchClickResponseDto | null> {
  try {
    const res = await apiClient.post<TrackSearchClickResponseDto>(
      '/search/click',
      args,
    );
    return res.data;
  } catch (e) {
    // Click tracking is best-effort. Swallow.
    return null;
  }
}
```

- [ ] **Step 2: Verify type and lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

Expected: both pass.

- [ ] **Step 3: Commit.**

Ask the user for permission before running `git commit`. Suggested message:
`feat(mobile): add smart-search API client`

---

## Task 2: Add the search store with MMKV-backed recent searches

**Files:**
- Create: `mobile/src/store/searchStore.ts`

This store owns: query state, suggestions, results, active entity-type filter, and recent searches. Recents are persisted via MMKV (mirrors `mobile/src/store/onboardingStore.ts` style — native MMKV with a web in-memory fallback).

- [ ] **Step 1: Create `mobile/src/store/searchStore.ts`:**

```ts
import { create } from 'zustand';
import { Platform } from 'react-native';
import type { MMKV } from 'react-native-mmkv';
import {
  suggest as apiSuggest,
  searchResults as apiSearchResults,
  type SuggestItemDto,
  type SearchResultItemDto,
} from '../services/searchApi';

// ---------------------------------------------------------------------------
// MMKV adapter — mirrors onboardingStore's pattern. Stores a single JSON
// string under `search.recents.v1`.
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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

export type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error';

interface SearchState {
  query: string;
  submittedQuery: string;

  suggestions: SuggestItemDto[];
  suggestStatus: Status;

  results: SearchResultItemDto[];
  searchLogId: number | null;
  resultsStatus: Status;
  activeEntityType: string | null;

  recents: RecentSearch[];

  // Actions
  setQuery: (q: string) => void;
  fetchSuggestions: (q: string) => Promise<void>;
  submit: (q: string) => Promise<void>;
  setEntityFilter: (type: string | null) => Promise<void>;
  refreshResults: () => Promise<void>;

  addRecent: (q: string) => void;
  removeRecent: (q: string) => void;
  clearRecents: () => void;
}

let suggestController: AbortController | null = null;
let resultsController: AbortController | null = null;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  submittedQuery: '',

  suggestions: [],
  suggestStatus: 'idle',

  results: [],
  searchLogId: null,
  resultsStatus: 'idle',
  activeEntityType: null,

  recents: readRecents(),

  setQuery: (q) => {
    set({ query: q });
    if (q.trim().length < 2) {
      // Cancel any in-flight suggest, blank the dropdown.
      suggestController?.abort();
      suggestController = null;
      set({ suggestions: [], suggestStatus: 'idle' });
      return;
    }
    void get().fetchSuggestions(q);
  },

  fetchSuggestions: async (q) => {
    suggestController?.abort();
    const ctrl = new AbortController();
    suggestController = ctrl;
    set({ suggestStatus: 'loading' });
    try {
      const data = await apiSuggest(q, ctrl.signal);
      // Bail if a newer request has superseded us.
      if (suggestController !== ctrl) return;
      set({ suggestions: data.suggestions, suggestStatus: 'success' });
    } catch (e) {
      if (suggestController !== ctrl) return;
      set({ suggestions: [], suggestStatus: 'error' });
    }
  },

  submit: async (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    resultsController?.abort();
    const ctrl = new AbortController();
    resultsController = ctrl;

    set({
      query: trimmed,
      submittedQuery: trimmed,
      activeEntityType: null,
      results: [],
      searchLogId: null,
      resultsStatus: 'loading',
      // Clear typeahead — we're navigating away from it.
      suggestions: [],
      suggestStatus: 'idle',
    });

    get().addRecent(trimmed);

    try {
      const data = await apiSearchResults({ q: trimmed }, ctrl.signal);
      if (resultsController !== ctrl) return;
      set({
        results: data.results,
        searchLogId: data.searchLogId,
        resultsStatus: data.results.length === 0 ? 'empty' : 'success',
      });
    } catch (e) {
      if (resultsController !== ctrl) return;
      set({ resultsStatus: 'error' });
    }
  },

  setEntityFilter: async (type) => {
    set({ activeEntityType: type });
    await get().refreshResults();
  },

  refreshResults: async () => {
    const { submittedQuery, activeEntityType } = get();
    if (!submittedQuery) return;

    resultsController?.abort();
    const ctrl = new AbortController();
    resultsController = ctrl;

    set({ resultsStatus: 'loading' });
    try {
      const data = await apiSearchResults(
        { q: submittedQuery, entityType: activeEntityType },
        ctrl.signal,
      );
      if (resultsController !== ctrl) return;
      set({
        results: data.results,
        searchLogId: data.searchLogId,
        resultsStatus: data.results.length === 0 ? 'empty' : 'success',
      });
    } catch {
      if (resultsController !== ctrl) return;
      set({ resultsStatus: 'error' });
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

- [ ] **Step 2: Verify type + lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

Expected: both pass.

- [ ] **Step 3: Commit.**

Ask the user before commit. Suggested message:
`feat(mobile): add searchStore with MMKV-backed recents`

---

## Task 3: Update navigation types for SearchStack

**Files:**
- Modify: `mobile/src/navigation/types.ts:105-109`

The current `SearchStackParamList` only declares `SearchMain`, `ArticleDetail`, `CelebrityProfile` (with the wrong `id: string` shape). The new search flow needs the same entity routes that `HomeStack` exposes, plus the new `SearchResults` screen.

- [ ] **Step 1: Replace the existing `SearchStackParamList` block (lines 105–109) with:**

```ts
export type SearchStackParamList = {
  SearchMain: undefined;
  SearchResults: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CelebrityProfile: { celebrity: import('../services/api').Celebrity };
  VideoDetail: { video: import('../services/api').Video };
  GalleryDetail:
    | { gallery: import('../services/api').Gallery }
    | { id: string | number; title?: string; thumbnail?: string | null };
};
```

- [ ] **Step 2: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: pass. (No screens reference these names yet — they're only consumed by `SearchStack.tsx` later.)

- [ ] **Step 3: Commit.**

Ask the user. Suggested message:
`refactor(mobile): expand SearchStackParamList for entity routes`

---

## Task 4: Build the `SearchInputHeader` component

**Files:**
- Create: `mobile/src/features/search/components/SearchInputHeader.tsx`

A controlled text input for the search bar. Used on both `SearchMainScreen` (autoFocus) and `SearchResultsScreen` (editable, submit re-runs search).

- [ ] **Step 1: Create the file with this content:**

```tsx
import React, { useMemo, useRef } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, Keyboard,
  type NativeSyntheticEvent, type TextInputSubmitEditingEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: (v: string) => void;
  onBack?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export default function SearchInputHeader({
  value,
  onChangeText,
  onSubmit,
  onBack,
  autoFocus,
  placeholder = 'Search movies, shows, celebrities…',
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inputRef = useRef<TextInput | null>(null);

  function handleSubmit(e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) {
    const v = e.nativeEvent.text.trim();
    if (!v) return;
    Keyboard.dismiss();
    onSubmit(v);
  }

  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
        />
        {value.length > 0 ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    iconBtn: { padding: 4 },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: c.text,
      padding: 0,
    },
  });
}
```

- [ ] **Step 2: Verify type + lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

- [ ] **Step 3: Commit.**

Ask user. Suggested message:
`feat(mobile): add SearchInputHeader component`

---

## Task 5: Build the small list-row + chip components

**Files:**
- Create: `mobile/src/features/search/components/SuggestionRow.tsx`
- Create: `mobile/src/features/search/components/RecentRow.tsx`
- Create: `mobile/src/features/search/components/EntityTypeChip.tsx`

Three small presentational components used by `SearchMainScreen` and `SearchResultsScreen`.

- [ ] **Step 1: Create `SuggestionRow.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SuggestItemDto } from '../../../services/searchApi';

interface Props {
  item: SuggestItemDto;
  onPress: () => void;
}

export default function SuggestionRow({ item, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="search" size={14} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.phrase} numberOfLines={1}>{item.phrase}</Text>
        {item.entityType ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{item.entityType}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="arrow-up-outline" size={16} color={colors.textTertiary}
                style={{ transform: [{ rotate: '-45deg' }] }} />
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    rowPressed: { backgroundColor: c.surface },
    thumb: {
      width: 36, height: 36, borderRadius: 8,
      backgroundColor: c.surface,
    },
    thumbFallback: {
      alignItems: 'center', justifyContent: 'center',
    },
    body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    phrase: { flexShrink: 1, color: c.text, fontSize: 14, fontWeight: '500' },
    pill: {
      paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 6, backgroundColor: c.primarySoft,
    },
    pillText: { fontSize: 10, fontWeight: '700', color: c.primary },
  });
}
```

- [ ] **Step 2: Create `RecentRow.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  q: string;
  onPress: () => void;
  onRemove: () => void;
}

export default function RecentRow({ q, onPress, onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.left, pressed && styles.pressed]}
      >
        <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
        <Text style={styles.text} numberOfLines={1}>{q}</Text>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    left: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    pressed: { backgroundColor: c.surface },
    text: { flex: 1, fontSize: 14, color: c.text },
    removeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  });
}
```

- [ ] **Step 3: Create `EntityTypeChip.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export default function EntityTypeChip({ label, active, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    label: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    labelActive: { color: c.primary },
  });
}
```

- [ ] **Step 4: Verify type + lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

- [ ] **Step 5: Commit.**

Ask user. Suggested message:
`feat(mobile): add SuggestionRow, RecentRow, EntityTypeChip`

---

## Task 6: Build the `ResultCard` component

**Files:**
- Create: `mobile/src/features/search/components/ResultCard.tsx`

A list cell for the full-results list. Thumbnail on the left, title + summary + entityType pill stacked on the right.

- [ ] **Step 1: Create the file:**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SearchResultItemDto } from '../../../services/searchApi';

interface Props {
  item: SearchResultItemDto;
  onPress: () => void;
}

export default function ResultCard({ item, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{item.entityType}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {item.summary ? (
          <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    thumb: {
      width: 92, height: 70, borderRadius: 8,
      backgroundColor: c.surface,
    },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 4 },
    pill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 6, backgroundColor: c.primarySoft,
    },
    pillText: { fontSize: 10, fontWeight: '700', color: c.primary },
    title: { fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 19 },
    summary: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  });
}
```

- [ ] **Step 2: Verify type + lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

- [ ] **Step 3: Commit.**

Ask user. Suggested message:
`feat(mobile): add ResultCard component`

---

## Task 7: Build the `UnsupportedEntitySheet`

**Files:**
- Create: `mobile/src/features/search/components/UnsupportedEntitySheet.tsx`

Bottom sheet shown when the user taps a result whose entity type doesn't have a native screen yet (`Topic`, `Forum`, `Movie`, `Show`, unknown). Offers an "Open in browser" CTA that links to `https://www.indiaforums.com/<url>`.

Uses `@gorhom/bottom-sheet` (already in dependencies).

- [ ] **Step 1: Create the file:**

```tsx
import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

export interface UnsupportedEntitySheetHandle {
  open: (payload: {
    title: string;
    entityType: string;
    imageUrl: string | null;
    url: string | null;
  }) => void;
  close: () => void;
}

const UnsupportedEntitySheet = forwardRef<UnsupportedEntitySheetHandle, object>(
  function UnsupportedEntitySheet(_props, ref) {
    const colors = useThemeStore((s) => s.colors);
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const sheetRef = useRef<BottomSheet>(null);
    const [payload, setPayload] = useState<{
      title: string;
      entityType: string;
      imageUrl: string | null;
      url: string | null;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      open: (p) => { setPayload(p); sheetRef.current?.expand(); },
      close: () => sheetRef.current?.close(),
    }), []);

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    );

    function handleOpen() {
      if (!payload?.url) {
        void Linking.openURL('https://www.indiaforums.com/');
        return;
      }
      void Linking.openURL('https://www.indiaforums.com/' + payload.url);
      sheetRef.current?.close();
    }

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={[260]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.body}>
          {payload ? (
            <>
              <View style={styles.header}>
                {payload.imageUrl ? (
                  <Image source={{ uri: payload.imageUrl }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.entityType}>{payload.entityType}</Text>
                  <Text style={styles.title} numberOfLines={2}>{payload.title}</Text>
                </View>
              </View>
              <Text style={styles.body2}>
                This {payload.entityType.toLowerCase()} page isn't available in
                the app yet. Open it on the web to view full details.
              </Text>
              <Pressable onPress={handleOpen} style={styles.cta}>
                <Ionicons name="open-outline" size={16} color={colors.onPrimary} />
                <Text style={styles.ctaText}>Open in browser</Text>
              </Pressable>
            </>
          ) : null}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

export default UnsupportedEntitySheet;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    body: { padding: 18, gap: 14 },
    header: { flexDirection: 'row', gap: 12 },
    thumb: {
      width: 64, height: 64, borderRadius: 8,
      backgroundColor: c.surface,
    },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    entityType: {
      fontSize: 11, fontWeight: '700', color: c.primary,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    title: { fontSize: 15, fontWeight: '600', color: c.text },
    body2: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 12,
    },
    ctaText: { fontSize: 14, fontWeight: '700', color: c.onPrimary },
  });
}
```

- [ ] **Step 2: Verify the `c.onPrimary` token exists in the theme. Open `mobile/src/theme/tokens.ts` and confirm a property named `onPrimary` is present in the `ThemeColors` type. If it's not, replace `c.onPrimary` with `'#fff'` in two places (the icon `color` and `ctaText.color`).**

- [ ] **Step 3: Verify type + lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

- [ ] **Step 4: Commit.**

Ask user. Suggested message:
`feat(mobile): add UnsupportedEntitySheet for non-native entity types`

---

## Task 8: Build the `useEntityNavigator` hook

**Files:**
- Create: `mobile/src/features/search/hooks/useEntityNavigator.ts`

Single hook that handles the per-entity-type tap routing. Takes either a suggestion or a result, fires `trackClick` (when a `searchLogId` is supplied), then either pushes a native screen or opens the unsupported-entity sheet.

The hook returns both an `onPress` factory and a ref handle for the sheet, so the screen owns one `<UnsupportedEntitySheet>` instance.

- [ ] **Step 1: Create the file:**

```ts
import { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import type { SearchStackParamList } from '../../../navigation/types';
import {
  trackClick,
  type SuggestItemDto,
  type SearchResultItemDto,
} from '../../../services/searchApi';
import {
  fetchVideoDetails,
  type Celebrity,
  type Video,
} from '../../../services/api';
import type { UnsupportedEntitySheetHandle } from '../components/UnsupportedEntitySheet';

type Nav = NativeStackNavigationProp<SearchStackParamList>;

export type SearchEntityShape = {
  entityType: string | null;
  entityId: number | null;
  title: string;
  url: string | null;
  imageUrl: string | null;
};

function fromSuggestion(s: SuggestItemDto): SearchEntityShape {
  return {
    entityType: s.entityType,
    entityId: s.entityId,
    title: s.phrase,
    url: s.url,
    imageUrl: s.imageUrl,
  };
}

function fromResult(r: SearchResultItemDto): SearchEntityShape {
  return {
    entityType: r.entityType,
    entityId: r.entityId,
    title: r.title,
    url: r.url,
    imageUrl: r.imageUrl,
  };
}

function synthesizeCelebrity(e: SearchEntityShape): Celebrity {
  return {
    id: String(e.entityId ?? ''),
    name: e.title,
    shortDesc: '',
    thumbnail: e.imageUrl,
    pageUrl: e.url ?? '',
    shareUrl: e.url ? `https://www.indiaforums.com/${e.url}` : '',
    category: 'bollywood',
    rank: 0,
    prevRank: 0,
    trend: 'stable',
    rankDiff: 0,
  };
}

export interface UseEntityNavigator {
  sheetRef: React.MutableRefObject<UnsupportedEntitySheetHandle | null>;
  isResolving: boolean;
  openSuggestion: (s: SuggestItemDto) => void;
  openResult: (r: SearchResultItemDto, searchLogId: number | null) => void;
}

export function useEntityNavigator(): UseEntityNavigator {
  const navigation = useNavigation<Nav>();
  const sheetRef = useRef<UnsupportedEntitySheetHandle | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const navigateNative = useCallback(
    async (e: SearchEntityShape) => {
      const id = e.entityId;
      if (id == null) {
        sheetRef.current?.open({
          title: e.title,
          entityType: e.entityType ?? 'Item',
          imageUrl: e.imageUrl,
          url: e.url,
        });
        return;
      }

      switch (e.entityType) {
        case 'Article':
          navigation.push('ArticleDetail', { id: String(id) });
          return;
        case 'Gallery':
          navigation.push('GalleryDetail', {
            id,
            title: e.title,
            thumbnail: e.imageUrl,
          });
          return;
        case 'Video': {
          setIsResolving(true);
          try {
            const detail = await fetchVideoDetails(String(id));
            if (!detail) throw new Error('Video not found');
            // VideoDetail expects a Video, not the detail wrapper. The detail
            // object is a superset — the screen reads only Video fields from
            // its route param. Cast through unknown to avoid widening the
            // route param type.
            navigation.push('VideoDetail', { video: detail as unknown as Video });
          } catch {
            sheetRef.current?.open({
              title: e.title,
              entityType: 'Video',
              imageUrl: e.imageUrl,
              url: e.url,
            });
          } finally {
            setIsResolving(false);
          }
          return;
        }
        case 'Person':
          navigation.push('CelebrityProfile', {
            celebrity: synthesizeCelebrity(e),
          });
          return;
        default:
          sheetRef.current?.open({
            title: e.title,
            entityType: e.entityType ?? 'Item',
            imageUrl: e.imageUrl,
            url: e.url,
          });
      }
    },
    [navigation],
  );

  const openSuggestion = useCallback(
    (s: SuggestItemDto) => {
      void Haptics.selectionAsync().catch(() => undefined);
      void navigateNative(fromSuggestion(s));
    },
    [navigateNative],
  );

  const openResult = useCallback(
    (r: SearchResultItemDto, searchLogId: number | null) => {
      void Haptics.selectionAsync().catch(() => undefined);
      if (searchLogId != null) {
        // Fire-and-forget — never await before navigating.
        void trackClick({
          searchLogId,
          entityType: r.entityType,
          entityId: r.entityId,
        });
      }
      void navigateNative(fromResult(r));
    },
    [navigateNative],
  );

  return { sheetRef, isResolving, openSuggestion, openResult };
}
```

- [ ] **Step 2: Sanity-check the `Video` type. Open `mobile/src/services/api.ts` and confirm both `Video` and the return type of `fetchVideoDetails` exist. The cast `as unknown as Video` is intentional because the existing `VideoDetail` screen accepts a `Video` route param but only reads a subset of fields — the detail object is a superset and works at runtime.**

If the type cast feels too loose to the implementer, an alternative is to fetch the lightweight `Video` shape via the listing endpoint (`fetchVideos` has a per-id mode in some codebases) — but `fetchVideoDetails` is the safe bet here.

- [ ] **Step 3: Verify type + lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

- [ ] **Step 4: Commit.**

Ask user. Suggested message:
`feat(mobile): add useEntityNavigator hook for search routing`

---

## Task 9: Build `SearchMainScreen`

**Files:**
- Create: `mobile/src/features/search/screens/SearchMainScreen.tsx`

The Search tab's landing screen. Three render states driven by store:

1. `query === ''` → header + recent searches (or first-launch hint).
2. `query.length >= 2` → suggestion dropdown + a trailing "Search for '{q}'" row.
3. After Enter or "Search for…" tap → navigate to `SearchResults`.

- [ ] **Step 1: Create the file:**

```tsx
import React, { useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { SearchStackParamList } from '../../../navigation/types';
import { useSearchStore } from '../../../store/searchStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

import SearchInputHeader from '../components/SearchInputHeader';
import SuggestionRow from '../components/SuggestionRow';
import RecentRow from '../components/RecentRow';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import { useEntityNavigator } from '../hooks/useEntityNavigator';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'SearchMain'>;

export default function SearchMainScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const submit = useSearchStore((s) => s.submit);
  const suggestions = useSearchStore((s) => s.suggestions);
  const recents = useSearchStore((s) => s.recents);
  const removeRecent = useSearchStore((s) => s.removeRecent);
  const clearRecents = useSearchStore((s) => s.clearRecents);

  const { sheetRef, openSuggestion } = useEntityNavigator();

  const handleSubmit = useCallback(
    async (q: string) => {
      await submit(q);
      navigation.push('SearchResults');
    },
    [submit, navigation],
  );

  const isTyping = query.trim().length >= 2;

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQuery}
        onSubmit={handleSubmit}
        autoFocus
      />

      {isTyping ? (
        <FlatList
          data={suggestions}
          keyExtractor={(s, i) => `${s.entityType ?? 'q'}-${s.entityId ?? i}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <SuggestionRow item={item} onPress={() => openSuggestion(item)} />
          )}
          ListFooterComponent={
            <Pressable
              onPress={() => handleSubmit(query)}
              style={({ pressed }) => [styles.searchForRow, pressed && styles.pressed]}
            >
              <Ionicons name="search" size={16} color={colors.primary} />
              <Text style={styles.searchForText}>
                Search for "<Text style={styles.searchForBold}>{query.trim()}</Text>"
              </Text>
            </Pressable>
          }
          ListEmptyComponent={null}
        />
      ) : (
        <FlatList
          data={recents}
          keyExtractor={(r) => r.q}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            recents.length > 0 ? (
              <View style={styles.recentsHeader}>
                <Text style={styles.recentsTitle}>Recent searches</Text>
                <Pressable onPress={clearRecents} hitSlop={8}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={42} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Search India Forums</Text>
              <Text style={styles.emptyBody}>
                Find movies, shows, celebrities, articles, videos, and forums.
              </Text>
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
      )}

      <UnsupportedEntitySheet ref={sheetRef} />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
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
    empty: {
      alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingTop: 80, paddingHorizontal: 32,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    emptyBody: {
      fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19,
    },
    searchForRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
      marginTop: 4,
    },
    pressed: { backgroundColor: c.surface },
    searchForText: { fontSize: 14, color: c.text },
    searchForBold: { fontWeight: '700', color: c.primary },
  });
}
```

- [ ] **Step 2: Verify type + lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

- [ ] **Step 3: Commit.**

Ask user. Suggested message:
`feat(mobile): add SearchMainScreen with typeahead and recents`

---

## Task 10: Build `SearchResultsScreen`

**Files:**
- Create: `mobile/src/features/search/screens/SearchResultsScreen.tsx`

Editable header input + sticky entity-type filter strip + scored result list.

- [ ] **Step 1: Create the file:**

```tsx
import React, { useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable, RefreshControl,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { SearchStackParamList } from '../../../navigation/types';
import { useSearchStore } from '../../../store/searchStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

import SearchInputHeader from '../components/SearchInputHeader';
import EntityTypeChip from '../components/EntityTypeChip';
import ResultCard from '../components/ResultCard';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import { useEntityNavigator } from '../hooks/useEntityNavigator';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'SearchResults'>;

export default function SearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const submit = useSearchStore((s) => s.submit);
  const submittedQuery = useSearchStore((s) => s.submittedQuery);
  const results = useSearchStore((s) => s.results);
  const searchLogId = useSearchStore((s) => s.searchLogId);
  const resultsStatus = useSearchStore((s) => s.resultsStatus);
  const activeEntityType = useSearchStore((s) => s.activeEntityType);
  const setEntityFilter = useSearchStore((s) => s.setEntityFilter);
  const refreshResults = useSearchStore((s) => s.refreshResults);

  const { sheetRef, openResult } = useEntityNavigator();

  // Build the chip list dynamically from the result set so we never show a
  // chip with zero matches. "All" is always first.
  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) set.add(r.entityType);
    // If a filter is active, the result set may already be narrowed —
    // ensure the active filter still shows as a chip.
    if (activeEntityType) set.add(activeEntityType);
    return Array.from(set).sort();
  }, [results, activeEntityType]);

  const handleResubmit = useCallback(
    async (q: string) => { await submit(q); },
    [submit],
  );

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQuery}
        onSubmit={handleResubmit}
        onBack={() => navigation.goBack()}
      />

      {entityTypes.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipStrip}
        >
          <EntityTypeChip
            label="All"
            active={activeEntityType == null}
            onPress={() => setEntityFilter(null)}
          />
          {entityTypes.map((t) => (
            <EntityTypeChip
              key={t}
              label={t}
              active={activeEntityType === t}
              onPress={() => setEntityFilter(t)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Body
        status={resultsStatus}
        results={results}
        submittedQuery={submittedQuery}
        searchLogId={searchLogId}
        onRetry={refreshResults}
        onPressItem={openResult}
        styles={styles}
        colors={colors}
      />

      <UnsupportedEntitySheet ref={sheetRef} />
    </View>
  );
}

interface BodyProps {
  status: ReturnType<typeof useSearchStore.getState>['resultsStatus'];
  results: ReturnType<typeof useSearchStore.getState>['results'];
  submittedQuery: string;
  searchLogId: number | null;
  onRetry: () => void;
  onPressItem: ReturnType<typeof useEntityNavigator>['openResult'];
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

function Body({
  status, results, submittedQuery, searchLogId, onRetry, onPressItem, styles, colors,
}: BodyProps) {
  if (status === 'loading' && results.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.textTertiary} />
        <Text style={styles.errorTitle}>Couldn't load search</Text>
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'empty') {
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No results for "{submittedQuery}"</Text>
        <Text style={styles.emptyBody}>
          Try a different spelling or remove filters.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={results}
      estimatedItemSize={94}
      keyExtractor={(r) => `${r.entityType}-${r.entityId}`}
      renderItem={({ item }) => (
        <ResultCard item={item} onPress={() => onPressItem(item, searchLogId)} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={status === 'loading'}
          onRefresh={onRetry}
          tintColor={colors.primary}
        />
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    chipStrip: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 10, paddingHorizontal: 32,
    },
    errorTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    retryBtn: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 10, backgroundColor: c.primarySoft,
    },
    retryText: { fontSize: 13, fontWeight: '700', color: c.primary },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    emptyBody: {
      fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18,
    },
  });
}
```

- [ ] **Step 2: Verify type + lint.**

```bash
cd mobile && npm run tsc && npm run lint
```

- [ ] **Step 3: Commit.**

Ask user. Suggested message:
`feat(mobile): add SearchResultsScreen with entity-type filter`

---

## Task 11: Wire `SearchStack.tsx`

**Files:**
- Modify: `mobile/src/navigation/SearchStack.tsx` (replace entire content)

Drop the placeholder; register the two new screens plus the entity-detail screens reused from the other stacks. Reuse the existing screen modules — do not create copies.

- [ ] **Step 1: Replace the whole file with:**

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SearchStackParamList } from './types';

import SearchMainScreen from '../features/search/screens/SearchMainScreen';
import SearchResultsScreen from '../features/search/screens/SearchResultsScreen';
import ArticleDetailScreen from '../features/news/screens/ArticleDetailScreen';
import CelebrityDetailScreen from '../features/celebrities/screens/CelebrityDetailScreen';
import VideoDetailScreen from '../features/videos/screens/VideoDetailScreen';
import GalleryDetailScreen from '../features/galleries/screens/GalleryDetailScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchMainScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="CelebrityProfile" component={CelebrityDetailScreen} />
      <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
      <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: The reused detail screens currently type their `route` against `HomeStackParamList`. That's fine at runtime because the param shapes match; React Navigation's screen registry is tolerant of multiple stacks pointing at the same screen file. But TypeScript will complain at the *call* sites in `useEntityNavigator` only if the param shapes diverge. Run:**

```bash
cd mobile && npm run tsc
```

Expected: pass.

If `tsc` reports a route-prop mismatch in one of the reused screens (e.g. `CelebrityDetailScreen` types `useRoute<RouteProp<HomeStackParamList, 'CelebrityProfile'>>()`), that's a pre-existing pattern across the codebase (the same screens are already shared by `MySpaceStack`) and does not block this work.

- [ ] **Step 3: Verify lint.**

```bash
cd mobile && npm run lint
```

- [ ] **Step 4: Commit.**

Ask user. Suggested message:
`feat(mobile): wire SearchStack to real search screens`

---

## Task 12: Manual smoke test + final verification

**Files:** none modified — this task only verifies behaviour.

- [ ] **Step 1: Start the dev server.**

```bash
cd mobile && npm start
```

Open the app in Expo Go or the simulator.

- [ ] **Step 2: Verify each acceptance criterion from the spec:**

  1. Open Search tab → input is autofocused, "Search India Forums" hint shows on first launch.
  2. Type "shahrukh" → typeahead dropdown appears with up to 10 suggestions within ~300ms of last keystroke.
  3. Tap a `Person` suggestion → CelebrityProfile opens with the person's name in the header. Biography tab fetches as normal.
  4. Press the keyboard's search button → SearchResults screen pushes; results list renders with entity-type chips.
  5. Tap "Article" chip → list narrows to articles. Tap "All" → list returns to mixed.
  6. Tap an `Article` result → ArticleDetail opens. (Verify the click was tracked: `apiClient` axios logs in dev console show `POST /search/click` 200.)
  7. Tap a `Movie` or `Show` result → UnsupportedEntitySheet opens with "Open in browser". Tapping the CTA opens the public web page in the OS browser.
  8. Press back to SearchResults → press back to SearchMain → switch to Home tab → switch back to Search → query, results, filter all preserved.
  9. Force-quit the app → reopen → tap Search → "Recent searches" still lists the queries you ran. Tap one → SearchResults re-runs that query.
  10. Long-press the per-recent "x" → that entry is removed. "Clear" wipes the whole list.
  11. (Guest mode — log out via My Space if possible) Verify search still works for an unauthenticated user.

- [ ] **Step 3: Final type + lint sweep.**

```bash
cd mobile && npm run tsc && npm run lint
```

Expected: both pass.

- [ ] **Step 4: Commit any final tweaks discovered during smoke test, then mark the feature complete.**

Ask the user before commit. Suggested message:
`feat(mobile): finalize search tab smart-search integration`

---

## Acceptance criteria (from spec)

1. ✅ Tapping the Search tab shows the recent searches list (or first-launch hint), with the input autofocused. — Task 9
2. ✅ Typing shows a typeahead dropdown of up to 10 suggestions within ~300ms of the last keystroke. — Task 9 (debounce-by-cancel via AbortController; suggest is fast)
3. ✅ Tapping a `Person` suggestion fetches and pushes the existing `CelebrityProfile`. — Task 8 + 11
4. ✅ Pressing Enter pushes `SearchResults` with the entity-type filter strip. — Task 9 + 10
5. ✅ Tapping an `Article` result POSTs `/search/click` and pushes `ArticleDetail`. — Task 8
6. ✅ Tapping `Movie`/`Show` opens the unsupported-entity sheet linking to the public web page. — Task 7 + 8
7. ✅ Switching tabs preserves query, results, and filter. — Task 2 (Zustand store)
8. ✅ Closing/reopening the app preserves recent searches. — Task 2 (MMKV)
9. ✅ All endpoints work without a logged-in user. — relies on existing `apiClient` config; verified in smoke test.

---

## Self-review notes

- All steps contain concrete code, exact paths, and exact commands.
- No `TBD` / `TODO` / "implement later" markers.
- Type identifiers are consistent: `SuggestItemDto`, `SearchResultItemDto`, `TrackSearchClickArgs`, `RecentSearch`, `Status`, `SearchEntityShape`, `UnsupportedEntitySheetHandle`, `UseEntityNavigator` — all defined in the task that introduces them and reused by name.
- Spec coverage:
  - 3 endpoints → Task 1.
  - Local recents + MMKV → Task 2.
  - Persistence across re-entry → Task 2.
  - Typeahead → Tasks 5 + 9.
  - Entity-type filter → Tasks 5 + 10.
  - Web fallback for Movie/Show → Tasks 7 + 8.
  - Click tracking fire-and-forget → Task 8.
  - Re-entry preserved query/results — Task 9 + 10 read from store.
  - Auth-optional — relies on `apiClient` (no change needed).
  - Acceptance smoke test → Task 12.
- Notable risk: `Person` navigation synthesizes a minimal `Celebrity` stub. The existing `CelebrityDetailScreen` only depends on `celebrity.id`, `celebrity.name`, and `celebrity.thumbnail` for its hero — biography and fans tabs self-fetch by id — so this stub is safe. If the screen ever starts reading other Celebrity fields (e.g. `rank`, `category`) directly without falling back, the synthesized `0`/`'bollywood'` defaults will appear; address that by either fetching the real Celebrity (which requires a new endpoint) or hiding those fields when zero/default.
