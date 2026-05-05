import { Platform } from 'react-native';
import type { MMKV } from 'react-native-mmkv';
import type { MovieDiscussionTopic } from '../../../services/api';

// MMKV-backed cache for movie discussion topics. The /search/results endpoint
// can cold-start at ~2s on the backend's first call per cycle; persisting the
// last successful response means returning users see threads instantly while
// react-query revalidates in the background.

interface StorageAdapter {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

const memStore: Record<string, string> = {};
const fallback: StorageAdapter = {
  getString: (k) => memStore[k],
  set:       (k, v) => { memStore[k] = v; },
};

function createStorage(): StorageAdapter {
  if (Platform.OS === 'web') return fallback;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-mmkv') as {
      createMMKV?: (cfg: { id: string }) => MMKV;
      MMKV?: { new (cfg: { id: string }): MMKV };
    };
    const kv = mod.createMMKV
      ? mod.createMMKV({ id: 'movies-discussion' })
      : mod.MMKV
        ? new mod.MMKV({ id: 'movies-discussion' })
        : null;
    if (!kv) return fallback;
    return {
      getString: (k) => kv.getString?.(k) ?? undefined,
      set:       (k, v) => kv.set(k, v),
    };
  } catch {
    return fallback;
  }
}

const storage = createStorage();

interface CacheEntry {
  topics: MovieDiscussionTopic[];
  savedAt: number; // unix ms
}

function key(movieTitle: string): string {
  return `disc:${movieTitle.trim().toLowerCase()}`;
}

export function loadDiscussionFromCache(movieTitle: string): MovieDiscussionTopic[] | undefined {
  const raw = storage.getString(key(movieTitle));
  if (!raw) return undefined;
  try {
    const entry: CacheEntry = JSON.parse(raw);
    if (!Array.isArray(entry.topics)) return undefined;
    return entry.topics;
  } catch {
    return undefined;
  }
}

export function saveDiscussionToCache(
  movieTitle: string,
  topics: MovieDiscussionTopic[],
): void {
  if (!topics.length) return; // never overwrite real data with empty
  const entry: CacheEntry = { topics, savedAt: Date.now() };
  try {
    storage.set(key(movieTitle), JSON.stringify(entry));
  } catch {
    // best-effort; in-memory fallback already handles missing native module
  }
}
