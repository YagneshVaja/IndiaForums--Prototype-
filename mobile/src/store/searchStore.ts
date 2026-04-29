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
    } catch {
      if (suggestController !== ctrl) return;
      set({ suggestions: [], suggestStatus: 'error' });
    }
  },

  submit: async (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    // Cancel any in-flight suggest — otherwise its late response would
    // re-open the dropdown after we've cleared it below.
    suggestController?.abort();
    suggestController = null;

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

    try {
      const data = await apiSearchResults({ q: trimmed }, ctrl.signal);
      if (resultsController !== ctrl) return;
      set({
        results: data.results,
        searchLogId: data.searchLogId,
        resultsStatus: data.results.length === 0 ? 'empty' : 'success',
      });
      // Only learn recents from successful submits — don't pollute the
      // list with queries that errored.
      get().addRecent(trimmed);
    } catch {
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
