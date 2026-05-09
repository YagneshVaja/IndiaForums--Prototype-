import { useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  fetchTopicPosts,
  reactToThread,
  type ForumTopic,
  type ReactionCode,
  type TopicPost,
} from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import {
  selectTopicReaction,
  useTopicReactionsStore,
  type TopicReactionState,
} from '../store/topicReactionsStore';
import {
  loadReactionState,
  persistReaction,
  readUserReactionFromJson,
} from '../data/reactionPersist';
import { patchReactionJson } from '../utils/patchReactionJson';

export type LikeOutcome = 'ok' | 'auth' | 'error';

// Module-level cache keyed by topicId. Persists across remounts so the OP-post
// lookup only happens once per topic per app session.
const opPostCache = new Map<number, TopicPost>();

/**
 * Fetch (and cache) the original post of a topic. Also pushes the post into
 * the topic-reactions store so subscribed components re-render with the real
 * reaction breakdown once it's known.
 */
export async function ensureOpPost(topic: ForumTopic): Promise<TopicPost | null> {
  const cached = opPostCache.get(topic.id);
  if (cached) return cached;
  try {
    const page = await fetchTopicPosts(topic.id, 1, 1);
    const op   = page.posts.find((p) => p.isOp) ?? page.posts[0] ?? null;
    if (op) {
      opPostCache.set(topic.id, op);
      useTopicReactionsStore.getState().set(topic.id, { opPost: op });
    }
    return op;
  } catch {
    return null;
  }
}

/**
 * Seed the OP-post cache + store from data already in hand (e.g. TopicDetailScreen
 * has the OP in its posts page and shouldn't trigger a redundant fetch via
 * ensureOpPost). Skips the seed if the store already has an opPost for this topic
 * — preserves any local reactionJson patch from a prior reaction in this session.
 *
 * Also seeds the user's prior reaction + threadLikeId on the OP from
 * (a) op.reactionJson if their uid is in the top-N reactors and
 * (b) MMKV for everyone below that cutoff. The posts endpoint never
 * returns threadLikeId, so MMKV is the only way to recover it across
 * sessions for OP toggle-off / switch-reaction to work.
 */
export function seedOpPost(topic: ForumTopic, op: TopicPost): void {
  const existing = useTopicReactionsStore.getState().byTopicId[topic.id];
  if (existing?.opPost) return;
  opPostCache.set(topic.id, op);

  const userId = useAuthStore.getState().user?.userId ?? 0;
  let seededReaction: ReactionCode | null = null;
  let seededLikeId: number | null = null;
  if (userId) {
    const fromServer = readUserReactionFromJson(op.reactionJson, userId);
    const persisted  = loadReactionState(userId);
    const code = fromServer ?? persisted.reactions[op.id] ?? null;
    if (code != null) seededReaction = code as ReactionCode;
    if (persisted.likeIds[op.id] != null) seededLikeId = persisted.likeIds[op.id];
  }

  useTopicReactionsStore.getState().set(topic.id, {
    opPost: op,
    reaction: seededReaction,
    threadLikeId: seededLikeId,
  });
}

// In-flight guard so two rapid taps on the same topic don't race.
const inFlight = new Set<number>();

/** Patches OP's reactionJson via the shared `patchReactionJson` helper. */
function patchOpReactionJson(
  op: TopicPost,
  prevReaction: ReactionCode | null,
  nextReaction: ReactionCode | null,
): TopicPost {
  return {
    ...op,
    reactionJson: patchReactionJson(op.reactionJson, prevReaction, nextReaction),
  };
}

/**
 * Apply a reaction to a topic's OP post. Updates the topic-reactions store
 * optimistically, fires the API, and reverts on failure. Callable from any
 * context (component or hook).
 */
export async function applyTopicReaction(
  topic: ForumTopic,
  next: ReactionCode | null,
): Promise<LikeOutcome> {
  if (inFlight.has(topic.id)) return 'ok';

  const auth = useAuthStore.getState();
  if (!auth.user) return 'auth';

  const store = useTopicReactionsStore.getState();
  const slot: TopicReactionState =
    store.byTopicId[topic.id] ?? {
      reaction: null, threadLikeId: null, countOverride: null, opPost: null,
    };

  if (slot.reaction === next) return 'ok';

  const wasReacted = slot.reaction != null;
  const willReact  = next != null;
  const delta      = (willReact ? 1 : 0) - (wasReacted ? 1 : 0);
  const baseCount  = slot.countOverride ?? topic.likes;
  const optimistic = Math.max(0, baseCount + delta);

  inFlight.add(topic.id);
  store.set(topic.id, { reaction: next, countOverride: optimistic });

  const op = await ensureOpPost(topic);
  if (!op) {
    store.set(topic.id, { reaction: slot.reaction, countOverride: baseCount });
    inFlight.delete(topic.id);
    return 'error';
  }

  const code: ReactionCode = next ?? 0;
  const res = await reactToThread({
    threadId:     op.id,
    forumId:      topic.forumId,
    reactionType: code,
    threadLikeId: slot.threadLikeId,
  });

  if (!res.ok) {
    store.set(topic.id, { reaction: slot.reaction, countOverride: baseCount });
    inFlight.delete(topic.id);
    return 'error';
  }

  // Mirror the user's pick into opPost.reactionJson so the emoji-stack pill
  // re-derives — TopicCard memoizes parseTopReactionTypes on this field and
  // the cached opPost reference is also reused by ReactionsSheet's effect dep.
  const patchedOp = patchOpReactionJson(op, slot.reaction, next);
  opPostCache.set(topic.id, patchedOp);

  const newThreadLikeId = next != null ? res.threadLikeId : null;
  store.set(topic.id, {
    reaction: next,
    threadLikeId: newThreadLikeId,
    countOverride: res.likeCount ?? optimistic,
    opPost: patchedOp,
  });

  // Persist so subsequent topic opens (or app restarts) see the user's OP
  // reaction highlighted and pass the threadLikeId back on toggle-off.
  if (auth.user?.userId) {
    persistReaction(auth.user.userId, op.id, next, newThreadLikeId);
  }

  inFlight.delete(topic.id);
  return 'ok';
}

export function useTopicLike(topic: ForumTopic) {
  const state = useTopicReactionsStore(useShallow(selectTopicReaction(topic.id)));
  const [pending, setPending] = useState(false);

  // OP-level reaction count. countOverride wins (set by user's own reaction
  // via reactToThread, which returns the OP's new like count). Otherwise we
  // use the cached OP post's likes — `null` until OP has been fetched, so
  // callers can render a placeholder instead of a misleading topic-aggregate.
  const opLikeCount: number | null =
    state.countOverride != null
      ? state.countOverride
      : state.opPost
        ? state.opPost.likes
        : null;

  const setReaction = useCallback(
    async (next: ReactionCode | null): Promise<LikeOutcome> => {
      setPending(true);
      const outcome = await applyTopicReaction(topic, next);
      setPending(false);
      return outcome;
    },
    [topic],
  );

  const toggleQuick = useCallback(
    (): Promise<LikeOutcome> => setReaction(state.reaction != null ? null : 1),
    [state.reaction, setReaction],
  );

  return {
    reaction: state.reaction,
    /** OP-level like count. `null` until the OP post has been fetched. */
    opLikeCount,
    pending,
    opPost: state.opPost,
    setReaction,
    toggleQuick,
  };
}
