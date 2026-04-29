import { create } from 'zustand';

export interface ForumFollowState {
  /** null = unknown / fall back to caller-provided initial value. */
  isFollowing: boolean | null;
  /** Override — supersedes Forum.followCount when set. */
  countOverride: number | null;
}

interface Store {
  byForumId: Record<number, ForumFollowState>;
  set: (forumId: number, patch: Partial<ForumFollowState>) => void;
  reset: (forumId: number) => void;
}

const EMPTY: ForumFollowState = {
  isFollowing: null,
  countOverride: null,
};

export const useForumFollowStore = create<Store>((set) => ({
  byForumId: {},
  set: (forumId, patch) =>
    set((s) => ({
      byForumId: {
        ...s.byForumId,
        [forumId]: { ...(s.byForumId[forumId] ?? EMPTY), ...patch },
      },
    })),
  reset: (forumId) =>
    set((s) => {
      const next = { ...s.byForumId };
      delete next[forumId];
      return { byForumId: next };
    }),
}));

export function selectForumFollow(forumId: number) {
  return (s: Store): ForumFollowState => s.byForumId[forumId] ?? EMPTY;
}
