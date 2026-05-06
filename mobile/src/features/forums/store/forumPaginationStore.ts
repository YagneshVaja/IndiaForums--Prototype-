import { create } from 'zustand';

/**
 * Persists the user's pagination context across navigation cycles.
 *
 *   - `forumPage[forumId]` — last page the user was viewing in this forum
 *   - `forumScroll[forumId:page]` — scroll Y on that specific page
 *   - `topicPage[topicId]` / `topicScroll[topicId:page]` — same for posts in a topic
 *
 * React Navigation's native-stack preserves screen state while a screen is on
 * the stack, but as soon as the user pops it off (back to the forum list and
 * then back into the forum), state is gone. This store survives those cycles.
 *
 * Stored in memory only — intentionally NOT persisted to disk: a stale "last
 * page" from a prior session would feel odd, and the data is cheap to drop.
 */
interface Store {
  forumPage: Record<number, number>;
  forumScroll: Record<string, number>;
  topicPage: Record<number, number>;
  topicScroll: Record<string, number>;

  setForumPage: (forumId: number, page: number) => void;
  setForumScroll: (forumId: number, page: number, y: number) => void;
  getForumScroll: (forumId: number, page: number) => number | undefined;

  setTopicPage: (topicId: number, page: number) => void;
  setTopicScroll: (topicId: number, page: number, y: number) => void;
  getTopicScroll: (topicId: number, page: number) => number | undefined;

  clearForum: (forumId: number) => void;
  clearTopic: (topicId: number) => void;
}

const fpKey = (forumId: number, page: number) => `${forumId}:${page}`;
const tpKey = (topicId: number, page: number) => `${topicId}:${page}`;

export const useForumPaginationStore = create<Store>((set, get) => ({
  forumPage: {},
  forumScroll: {},
  topicPage: {},
  topicScroll: {},

  setForumPage: (forumId, page) =>
    set((s) => ({ forumPage: { ...s.forumPage, [forumId]: page } })),
  setForumScroll: (forumId, page, y) =>
    set((s) => ({ forumScroll: { ...s.forumScroll, [fpKey(forumId, page)]: y } })),
  getForumScroll: (forumId, page) => get().forumScroll[fpKey(forumId, page)],

  setTopicPage: (topicId, page) =>
    set((s) => ({ topicPage: { ...s.topicPage, [topicId]: page } })),
  setTopicScroll: (topicId, page, y) =>
    set((s) => ({ topicScroll: { ...s.topicScroll, [tpKey(topicId, page)]: y } })),
  getTopicScroll: (topicId, page) => get().topicScroll[tpKey(topicId, page)],

  clearForum: (forumId) =>
    set((s) => {
      const fp = { ...s.forumPage };
      delete fp[forumId];
      const fs: Record<string, number> = {};
      const prefix = `${forumId}:`;
      for (const k of Object.keys(s.forumScroll)) {
        if (!k.startsWith(prefix)) fs[k] = s.forumScroll[k];
      }
      return { forumPage: fp, forumScroll: fs };
    }),
  clearTopic: (topicId) =>
    set((s) => {
      const tp = { ...s.topicPage };
      delete tp[topicId];
      const ts: Record<string, number> = {};
      const prefix = `${topicId}:`;
      for (const k of Object.keys(s.topicScroll)) {
        if (!k.startsWith(prefix)) ts[k] = s.topicScroll[k];
      }
      return { topicPage: tp, topicScroll: ts };
    }),
}));

/** Selector helpers — used with `useShallow` or directly in `useStore`. */
export function selectForumPage(forumId: number) {
  return (s: Store): number => s.forumPage[forumId] ?? 1;
}
export function selectTopicPage(topicId: number) {
  return (s: Store): number => s.topicPage[topicId] ?? 1;
}
