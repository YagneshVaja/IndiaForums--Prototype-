import { Platform } from 'react-native';
import type { MMKV } from 'react-native-mmkv';

// MMKV-backed persistence for per-post reactions + threadLikeIds. The
// /forums/topics/{id}/posts endpoint does not return the current user's
// per-post reaction state in its response (verified against the live
// API — `userJsonData` is null even when authenticated for many shapes,
// and `threadLikeId` is never present on a post entry). The web prototype
// at `indiaforums/` works around the same constraint via localStorage;
// mobile mirrors that with MMKV so reactions persist across remounts and
// app launches.
//
// We also do a server-side seed via `post.reactionJson` (parsed for the
// current user's `uid` entry) — that's the authoritative source when the
// user is in the top-N reactors. MMKV is the fallback for everyone below
// the top-N cutoff (the backend trims the per-user list at some depth).

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
     
    const mod = require('react-native-mmkv') as {
      createMMKV?: (cfg: { id: string }) => MMKV;
      MMKV?: { new (cfg: { id: string }): MMKV };
    };
    const kv = mod.createMMKV
      ? mod.createMMKV({ id: 'forum-reactions' })
      : mod.MMKV
        ? new mod.MMKV({ id: 'forum-reactions' })
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

interface PersistEntry {
  /** postId -> reactionCode (1-7). Code 0 / removed reactions are deleted. */
  reactions: Record<string, number>;
  /** postId -> threadLikeId returned by the API on the last successful react. */
  likeIds: Record<string, number>;
}

const EMPTY: PersistEntry = { reactions: {}, likeIds: {} };

function key(userId: number): string {
  return `forum-reactions:${userId}`;
}

function load(userId: number): PersistEntry {
  const raw = storage.getString(key(userId));
  if (!raw) return { ...EMPTY };
  try {
    const e = JSON.parse(raw);
    return {
      reactions: (e?.reactions && typeof e.reactions === 'object') ? e.reactions : {},
      likeIds:   (e?.likeIds   && typeof e.likeIds   === 'object') ? e.likeIds   : {},
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(userId: number, entry: PersistEntry): void {
  try {
    storage.set(key(userId), JSON.stringify(entry));
  } catch { /* best effort */ }
}

/**
 * Read all persisted reactions + likeIds for a user.
 * Returns numeric-keyed maps matching the in-memory shape used by callers.
 */
export function loadReactionState(userId: number): {
  reactions: Record<number, number>;
  likeIds:   Record<number, number>;
} {
  const raw = load(userId);
  const reactions: Record<number, number> = {};
  const likeIds:   Record<number, number> = {};
  for (const [k, v] of Object.entries(raw.reactions)) reactions[Number(k)] = Number(v);
  for (const [k, v] of Object.entries(raw.likeIds))   likeIds[Number(k)]   = Number(v);
  return { reactions, likeIds };
}

/**
 * Persist a single post's reaction state after a successful react. Pass
 * `code = null` (or 0) and `threadLikeId = null` to clear the entry — the
 * API treats reactionType=0 as "remove" and we forget the threadLikeId
 * along with it.
 */
export function persistReaction(
  userId: number,
  postId: number,
  code: number | null,
  threadLikeId: number | null,
): void {
  if (!userId) return;
  const entry = load(userId);
  const k = String(postId);
  if (code == null || code === 0) {
    delete entry.reactions[k];
  } else {
    entry.reactions[k] = code;
  }
  if (threadLikeId == null) {
    delete entry.likeIds[k];
  } else {
    entry.likeIds[k] = threadLikeId;
  }
  save(userId, entry);
}

/**
 * Parse a post's `reactionJson` and find the current user's reaction code
 * (if their uid is in the top-N reactors the backend returns). Returns
 * null when not found / malformed / no userId given.
 *
 * `reactionJson` shape: `{"json":[{"lt":<reactionCode>,"lc":<count>,"uid":<userId>,"un":<userName>},...]}`
 */
export function readUserReactionFromJson(
  reactionJson: string | null | undefined,
  userId: number | null | undefined,
): number | null {
  if (!reactionJson || !userId) return null;
  try {
    const parsed = JSON.parse(reactionJson);
    const entries: Array<{ lt?: number | string; uid?: number | string }> = parsed?.json ?? [];
    const mine = entries.find((e) => Number(e?.uid) === Number(userId));
    if (mine?.lt != null) {
      const lt = Number(mine.lt);
      if (Number.isFinite(lt) && lt > 0) return lt;
    }
    return null;
  } catch {
    return null;
  }
}
