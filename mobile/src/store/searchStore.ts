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
const TRENDING_KEY = 'search.trending.v1';
const TRENDING_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_RECENTS = 10;
const QUERY_CACHE_TTL_MS = 5 * 60 * 1000;    // 5min — entity matches don't age fast
const QUERY_CACHE_MAX = 20;                  // bounded LRU; query strings are tiny

interface QueryCacheEntry {
  sections: SmartSearchSectionDto[];
  fetchedAt: number;
  isEmpty: boolean;
}
const queryCache = new Map<string, QueryCacheEntry>();

function cacheKey(q: string): string {
  return q.trim().toLowerCase();
}

function readQueryCache(q: string): QueryCacheEntry | null {
  const key = cacheKey(q);
  const hit = queryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > QUERY_CACHE_TTL_MS) {
    queryCache.delete(key);
    return null;
  }
  // Touch for LRU ordering (Map iteration order = insertion order).
  queryCache.delete(key);
  queryCache.set(key, hit);
  return hit;
}

function writeQueryCache(q: string, entry: QueryCacheEntry): void {
  const key = cacheKey(q);
  if (queryCache.has(key)) queryCache.delete(key);
  queryCache.set(key, entry);
  while (queryCache.size > QUERY_CACHE_MAX) {
    const oldest = queryCache.keys().next().value;
    if (oldest === undefined) break;
    queryCache.delete(oldest);
  }
}

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

interface TrendingCache {
  items: SmartTrendingItemDto[];
  fetchedAt: number;
}

function readTrending(): SmartTrendingItemDto[] {
  const raw = storage.getString(TRENDING_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TrendingCache | null;
    if (!parsed || !Array.isArray(parsed.items)) return [];
    if (Date.now() - parsed.fetchedAt > TRENDING_TTL_MS) return [];
    return parsed.items.filter((x): x is SmartTrendingItemDto =>
      !!x && typeof x.query === 'string' && typeof x.searchCount === 'number',
    );
  } catch {
    return [];
  }
}

function writeTrending(items: SmartTrendingItemDto[]): void {
  if (items.length === 0) return;
  const cache: TrendingCache = { items, fetchedAt: Date.now() };
  storage.set(TRENDING_KEY, JSON.stringify(cache));
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
  trending: readTrending(),
  activeContentTypeId: null,
  recents: readRecents(),

  setQuery: (q) => {
    set({ query: q });
    if (smartDebounce) clearTimeout(smartDebounce);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      smartController?.abort();
      smartController = null;
      set({ sections: [], status: 'idle', activeContentTypeId: null });
      return;
    }
    // Cache fast-path — re-typing or backspacing into a previously-seen query
    // skips the network entirely and renders instantly.
    const cached = readQueryCache(trimmed);
    if (cached) {
      smartController?.abort();
      smartController = null;
      set({
        sections: cached.sections,
        status: cached.isEmpty ? 'empty' : 'success',
      });
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
    // Serve from cache when fresh — avoids redundant round-trips when the
    // submit path or filter chip re-enters fetchSmart for a query we already
    // resolved.
    const cached = readQueryCache(q);
    if (cached) {
      smartController?.abort();
      smartController = null;
      set({
        sections: cached.sections,
        status: cached.isEmpty ? 'empty' : 'success',
      });
      return;
    }
    smartController?.abort();
    const ctrl = new AbortController();
    smartController = ctrl;
    set({ status: 'loading' });
    try {
      const data = await apiSmart({ query: q, contentTypeId: 0 }, ctrl.signal);
      if (smartController !== ctrl) return;
      const isEmpty = data.sections.every((s) => s.items.length === 0);
      const nextTrending = data.trendingSearches.length > 0
        ? data.trendingSearches
        : get().trending;
      if (data.trendingSearches.length > 0) writeTrending(data.trendingSearches);
      writeQueryCache(q, { sections: data.sections, fetchedAt: Date.now(), isEmpty });
      set({
        sections: data.sections,
        trending: nextTrending,
        status: isEmpty ? 'empty' : 'success',
      });
    } catch (e) {
      if (smartController !== ctrl) return;
      const code = (e as { code?: string } | null)?.code;
      if (code === 'ERR_CANCELED' || code === 'CanceledError') return;
      set({ status: 'error' });
    }
  },

  submit: async (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    const state = get();
    const sameQuery = state.query.trim() === trimmed;
    set({ query: trimmed, activeContentTypeId: null });

    // Fast-path: the typeahead already has a final answer for this exact
    // query (success with results, or known-empty). Just record the recent —
    // no extra round-trip. This is what makes the keyboard "Search" key feel
    // instant after the user has been typing.
    if (sameQuery && (
      (state.status === 'success' && state.sections.length > 0) ||
      state.status === 'empty'
    )) {
      if (smartDebounce) {
        clearTimeout(smartDebounce);
        smartDebounce = null;
      }
      get().addRecent(trimmed);
      return;
    }

    // A debounced fetch is pending or in flight for the same query. Let it
    // resolve and just record the recent now.
    if (sameQuery && state.status === 'loading') {
      get().addRecent(trimmed);
      return;
    }

    if (smartDebounce) {
      clearTimeout(smartDebounce);
      smartDebounce = null;
    }
    await get().fetchSmart(trimmed);
    const finalStatus = get().status;
    if (finalStatus === 'success' || finalStatus === 'empty') {
      get().addRecent(trimmed);
    }
  },

  setFilter: (id) => {
    set({ activeContentTypeId: id });
  },

  loadTrending: async () => {
    if (get().trending.length > 0) return;
    try {
      const data = await apiSmart({ contentTypeId: 0 });
      if (data.trendingSearches.length > 0) {
        writeTrending(data.trendingSearches);
        set({ trending: data.trendingSearches });
      }
    } catch {
      // Empty-state trending is best-effort.
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
