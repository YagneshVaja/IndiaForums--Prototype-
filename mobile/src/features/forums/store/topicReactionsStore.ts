import { create } from 'zustand';
import type { ReactionCode, TopicPost } from '../../../services/api';

export interface TopicReactionState {
  reaction: ReactionCode | null;
  threadLikeId: number | null;
  /** Override — when present, supersedes ForumTopic.likes. */
  countOverride: number | null;
  /**
   * Cached OP post. Populated the first time we need to react / open the
   * reactions list for this topic, then reused for the session.
   */
  opPost: TopicPost | null;
}

interface Store {
  byTopicId: Record<number, TopicReactionState>;
  set: (topicId: number, patch: Partial<TopicReactionState>) => void;
  reset: (topicId: number) => void;
}

const EMPTY: TopicReactionState = {
  reaction: null,
  threadLikeId: null,
  countOverride: null,
  opPost: null,
};

export const useTopicReactionsStore = create<Store>((set) => ({
  byTopicId: {},
  set: (topicId, patch) =>
    set((s) => ({
      byTopicId: {
        ...s.byTopicId,
        [topicId]: { ...(s.byTopicId[topicId] ?? EMPTY), ...patch },
      },
    })),
  reset: (topicId) =>
    set((s) => {
      const next = { ...s.byTopicId };
      delete next[topicId];
      return { byTopicId: next };
    }),
}));

export function selectTopicReaction(topicId: number) {
  return (s: Store): TopicReactionState => s.byTopicId[topicId] ?? EMPTY;
}
