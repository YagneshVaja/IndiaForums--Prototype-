import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet, FlatList,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming, Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack, type TopNavAction } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import PostCard from '../components/PostCard';
import ReplyComposerSheet, { type QuotedPost } from '../components/ReplyComposerSheet';
import ReactionPickerSheet, { type AnchorRect } from '../components/ReactionPickerSheet';
import ReactionsSheet from '../components/ReactionsSheet';
import UserMiniCard from '../components/UserMiniCard';
import PostEditHistoryModal from '../components/PostEditHistoryModal';
import PollWidget from '../components/PollWidget';
import TopicModActionsSheet, { type ActionKey as ModActionKey } from '../components/TopicModActionsSheet';
import PostModActionsSheet, { type PostActionKey } from '../components/PostModActionsSheet';
import SearchBar, { type SearchBarHandle } from '../components/SearchBar';
import JumpToPageSheet from '../components/JumpToPageSheet';
import ForumPaginationBar from '../components/ForumPaginationBar';
import FrequentPostersSheet from '../components/FrequentPostersSheet';
import AvatarCluster from '../components/AvatarCluster';
import { useTopicPosts, TOPIC_POSTS_PAGE_SIZE } from '../hooks/useTopicPosts';
import { useForumPaginationStore, selectTopicPage } from '../store/forumPaginationStore';
import { useTopicTopPosters } from '../hooks/useTopicTopPosters';
import { applyTopicReaction, seedOpPost } from '../hooks/useTopicLike';
import {
  loadReactionState,
  persistReaction,
  readUserReactionFromJson,
} from '../data/reactionPersist';
import { patchReactionJson } from '../utils/patchReactionJson';
import { selectTopicReaction, useTopicReactionsStore } from '../store/topicReactionsStore';
import { useShallow } from 'zustand/react/shallow';
import { describeFetchError } from '../../../services/fetchError';
import { stripPostHtml } from '../utils/stripHtml';
import { formatCount } from '../utils/format';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { ForumsStackParamList } from '../../../navigation/types';
import {
  reactToThread, editPost, castPollVote, closeTopic, openTopic,
  type ForumTopic, type ReactionCode, type TopicPost, type TopicPoll,
} from '../../../services/api';

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'TopicDetail'>;
type Rt  = RouteProp<ForumsStackParamList, 'TopicDetail'>;

export default function TopicDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { topic, forum, jumpToLast, autoAction } = useRoute<Rt>().params;
  const currentUser = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();

  const [replyOpen, setReplyOpen] = useState(false);
  const [quotedPost, setQuotedPost] = useState<QuotedPost | null>(null);

  const [reactionMap, setReactionMap]   = useState<Record<number, ReactionCode | null>>({});
  const [likeIdMap, setLikeIdMap]       = useState<Record<number, number>>({});
  const [likeCountMap, setLikeCountMap] = useState<Record<number, number>>({});
  const [pendingSet, setPendingSet]     = useState<Set<number>>(new Set());
  // Live-patched `reactionJson` per post, keyed by postId. Surfaces the
  // user's freshly-added emoji in the aggregate pill on the left of each
  // post card without waiting for the next /posts fetch. OP uses
  // opSlot.opPost.reactionJson (patched in useTopicLike) — this map is
  // the parallel mechanism for non-OP replies.
  const [reactionJsonMap, setReactionJsonMap] = useState<Record<number, string | null>>({});

  // OP-post reaction state lives in the shared topic-reactions store so that
  // listing views (MyPostsList / AllTopicsView / etc.) and this screen stay in
  // sync. Non-OP posts continue to use the local reactionMap above.
  const opSlot = useTopicReactionsStore(useShallow(selectTopicReaction(topic.id)));

  const [pickerFor, setPickerFor] = useState<TopicPost | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<AnchorRect | null>(null);
  const [reactionsFor, setReactionsFor] = useState<TopicPost | null>(null);
  const [miniCardFor, setMiniCardFor]   = useState<TopicPost | null>(null);
  const [editHistoryFor, setEditHistoryFor] = useState<TopicPost | null>(null);

  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editText, setEditText]     = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);

  const [pollVotedIds, setPollVotedIds] = useState<number[] | null>(null);
  const [pollVoting, setPollVoting]     = useState(false);
  const [pollError, setPollError]       = useState<string | null>(null);
  const [pollLockBusy, setPollLockBusy] = useState(false);
  const [pollOverrides, setPollOverrides] = useState<Record<number, number>>({});

  const [sortBy, setSortBy] = useState<'date' | 'likes'>('date');
  const [postSearch, setPostSearch] = useState('');
  const [debouncedPostSearch, setDebouncedPostSearch] = useState('');
  const persistedTopicPage = useForumPaginationStore(selectTopicPage(topic.id));
  const [currentPage, setCurrentPage] = useState(persistedTopicPage);
  const [jumpSheetOpen, setJumpSheetOpen] = useState(false);
  const [contributorsOpen, setContributorsOpen] = useState(false);
  const lastSavedScrollRef = useRef(0);
  // Hide-on-scroll for the bottom pagination dock — Safari / Twitter / iMessage
  // pattern. We track the previous scroll Y to detect direction; a small
  // threshold prevents jitter at rest, and a guard timestamp around sort/page
  // changes ignores the synthetic scroll events those actions emit.
  const [paginationHidden, setPaginationHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const sortChangedAtRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPostSearch(postSearch.trim()), 100);
    return () => clearTimeout(t);
  }, [postSearch]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modSheetOpen, setModSheetOpen] = useState(false);
  const [postSheetFor, setPostSheetFor] = useState<TopicPost | null>(null);

  const listRef = useRef<FlatList<TopicPost>>(null);
  const didJumpToLastRef = useRef(false);
  const didAutoActionRef = useRef(false);

  // Same-reaction UNDO: when user taps same reaction twice, show inline alert
  const [sameReactionPostId, setSameReactionPostId] = useState<number | null>(null);
  const sameReactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevReactionRef   = useRef<Record<number, ReactionCode | null>>({});

  function showSameReactionAlert(postId: number) {
    setSameReactionPostId(postId);
    if (sameReactionTimer.current) clearTimeout(sameReactionTimer.current);
    sameReactionTimer.current = setTimeout(() => setSameReactionPostId(null), 4000);
  }

  useEffect(() => () => {
    if (sameReactionTimer.current) clearTimeout(sameReactionTimer.current);
  }, []);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useTopicPosts(topic.id, debouncedPostSearch, currentPage, sortBy);

  const firstPage = data?.pages[0];
  const liveTopic: ForumTopic = firstPage?.topicDetail
    ? { ...topic, ...firstPage.topicDetail }
    : topic;
  const forumFlairs = firstPage?.flairs ?? [];

  const { data: topPosters = [] } = useTopicTopPosters(topic.id, 12);
  const topicFlair = useMemo(
    () => forumFlairs.find(f => f.id === liveTopic.flairId) ?? null,
    [forumFlairs, liveTopic.flairId],
  );

  // OP avatar — used to upgrade the colored-letter placeholder once posts arrive.
  const opAvatarUrl = useMemo<string | null>(() => {
    for (const page of data?.pages || []) {
      for (const post of page.posts) {
        if (post.isOp) return post.avatarUrl ?? null;
      }
    }
    return null;
  }, [data]);

  // Page-by-page pagination: only the current page's posts are displayed.
  const allPosts = useMemo<TopicPost[]>(
    () => firstPage?.posts ?? [],
    [firstPage],
  );

  // Once the OP arrives from the server, push it into the shared store so
  // the LIKE button on this screen and the emoji-stack pill on listing-view
  // TopicCards read from the same source. Skips if a prior reaction in this
  // session has already populated the slot (preserves the patched reactionJson).
  useEffect(() => {
    const op = allPosts.find(p => p.isOp);
    if (op) seedOpPost(liveTopic, op);
  }, [allPosts, liveTopic]);

  // Seed per-post reaction state from (a) the server's reactionJson when
  // the current user is in the top-N reactors, and (b) MMKV for everyone
  // below that cutoff plus the threadLikeId (which the posts endpoint
  // never returns). Without this, the user's prior reactions don't show
  // as highlighted on load and the optimistic delta on the next tap is
  // wrong (`prev = null`, count off by one), and removing/switching a
  // reaction silently sends `threadLikeId: null` to the API which
  // breaks the toggle-off flow.
  //
  // Only fills GAPS — any post the user has already acted on in this
  // session keeps its in-memory state, so a fast tap right after a load
  // doesn't get clobbered by stale persisted data.
  useEffect(() => {
    const uid = currentUser?.userId;
    if (!uid || allPosts.length === 0) return;
    const persisted = loadReactionState(uid);

    setReactionMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const post of allPosts) {
        if (next[post.id] != null) continue;
        const fromServer = readUserReactionFromJson(post.reactionJson, uid);
        const code = fromServer ?? persisted.reactions[post.id] ?? null;
        if (code != null) {
          next[post.id] = code as ReactionCode;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setLikeIdMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const post of allPosts) {
        if (next[post.id] != null) continue;
        const id = persisted.likeIds[post.id];
        if (id != null) {
          next[post.id] = id;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [allPosts, currentUser?.userId]);

  // OP reference — kept for the auto-action effect below (a navigation can
  // arrive with `autoAction='like'/'reply'/'quote'` targeting the OP). The
  // OP is rendered as part of `sortedPosts`, not in a separate header slot.
  const opPost = useMemo<TopicPost | null>(
    () => allPosts.find(p => p.isOp) ?? null,
    [allPosts],
  );

  // OP is rendered directly in the ListHeaderComponent (above the topic
  // metadata block) so the screen reads top-to-bottom: forum strip → OP →
  // title/stats/contributors → search → sort → replies. The list data only
  // contains replies, so toggling Latest ↔ Top sorts replies in place
  // without disturbing the OP's position. Header height stays constant
  // across sort toggles, avoiding the scroll-Y "slide" issue.
  const sortedPosts = useMemo<TopicPost[]>(() => {
    // Server now owns the ordering — `sortBy` flows through useTopicPosts
    // into the request, so `allPosts` arrives already in the right order
    // (chronological for `date`, likes-desc for `likes`). We only filter
    // out the OP (rendered separately in the header) and apply the live
    // local search filter while the debounced server query catches up.
    const liveQuery = postSearch.trim().toLowerCase();
    let posts = allPosts.filter(p => !p.isOp);

    if (liveQuery) {
      const serverInSync = debouncedPostSearch.toLowerCase() === liveQuery;
      if (!serverInSync) {
        posts = posts.filter(p => {
          const msg = (p.message || '').toLowerCase();
          const author = (p.author || '').toLowerCase();
          return msg.includes(liveQuery) || author.includes(liveQuery);
        });
      }
    }

    return posts;
  }, [allPosts, postSearch, debouncedPostSearch]);

  // Maps each post's id back to its chronological position in the loaded
  // page, so the post number labels (#1, #2, …) reflect the *posting order*
  // even when the visible order has been re-sorted by Top.
  const postIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    allPosts.forEach((p, i) => map.set(p.id, i));
    return map;
  }, [allPosts]);

  useEffect(() => {
    if (!jumpToLast || didJumpToLastRef.current) return;
    if (sortedPosts.length === 0) return;
    didJumpToLastRef.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [jumpToLast, sortedPosts.length]);

  // Pagination — derive total pages from server-reported totalCount.
  const totalPostCount = firstPage?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPostCount / TOPIC_POSTS_PAGE_SIZE));

  // Only the search box bypasses pagination — sorting by Top still operates
  // on the same paginated set, so the pagination bar stays visible. (The
  // earlier behavior of hiding the bar on sort caused a jarring "slide up"
  // when toggling Latest ↔ Top.)
  const isFilteringPosts = postSearch.trim().length > 0;

  // Auto-hide is intentionally disabled on this detail screen — modern
  // detail screens (Apple Mail, Messages, Notes) keep their bottom bar
  // pinned. Auto-hide on a paginated detail caused the pagination bar to
  // visually slide whenever sort/filter actions caused FlashList re-layout
  // and emitted phantom scroll events.

  // Sort-transition fade. Modeled on the App Store / YouTube pattern: fade
  // the list out, swap the data + scroll to top, fade back in. This masks
  // the inherent layout movement of items reordering, so the user perceives
  // a deliberate transition rather than an unexpected "slide".
  const listOpacity = useSharedValue(1);
  const animatedListStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  const toggleSort = useCallback(() => {
    sortChangedAtRef.current = Date.now();
    // Force the pagination dock back into view as the list re-orders — the
    // user just hit the sort chip in the dock, so it should still be reachable.
    setPaginationHidden(false);
    // Near-instant flash. Total transition ≈ 100ms — fast enough to feel
    // immediate while still masking the items reordering underneath.
    // The list intentionally stays at the user's current scroll position;
    // scrolling to the top on sort toggle felt jarring, and React Query's
    // `keepPreviousData` keeps the visible items in place while the fresh
    // server-sorted page is fetched.
    listOpacity.value = withTiming(0.55, {
      duration: 30,
      easing: Easing.out(Easing.cubic),
    });
    setTimeout(() => {
      setSortBy((prev) => (prev === 'date' ? 'likes' : 'date'));
      requestAnimationFrame(() => {
        listOpacity.value = withTiming(1, {
          duration: 70,
          easing: Easing.out(Easing.cubic),
        });
      });
    }, 35);
  }, [listOpacity]);

  // Suppress scroll-save writes briefly after a page change, so the
  // scroll-to-0 we trigger on jump doesn't overwrite the persisted offset.
  const pageChangedAtRef = useRef(0);

  const handleJumpToPage = useCallback((page: number) => {
    if (page === currentPage) return;
    setJumpSheetOpen(false);
    pageChangedAtRef.current = Date.now();
    // Pagination dock should be visible after a page change — the user just
    // landed on a fresh page, surfacing the controls is the right default.
    setPaginationHidden(false);
    setCurrentPage(page);
    useForumPaginationStore.getState().setTopicPage(topic.id, page);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [topic.id, currentPage]);

  // Restore scroll position once posts arrive for the current page.
  const restoreKey = `${topic.id}:${currentPage}`;
  useEffect(() => {
    if (!firstPage) return;
    const y = useForumPaginationStore.getState().getTopicScroll(topic.id, currentPage) ?? 0;
    if (y > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: y, animated: false });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreKey, !!firstPage]);

  const displayPoll = useMemo<TopicPoll | null>(() => {
    if (!liveTopic.poll) return null;
    const bump = Object.values(pollOverrides).reduce((a, b) => a + b, 0);
    return {
      ...liveTopic.poll,
      totalVotes: liveTopic.poll.totalVotes + bump,
      options: liveTopic.poll.options.map(o => ({
        ...o,
        votes: o.votes + (pollOverrides[o.id] || 0),
      })),
    };
  }, [liveTopic.poll, pollOverrides]);

  const pollVoted = pollVotedIds != null || !!liveTopic.poll?.hasVoted;

  const forumBg    = forum?.bg    ?? '#3558F0';
  const forumEmoji = forum?.emoji ?? '💬';

  const canEditTopic     = (forum?.editPosts     ?? 0) > 0;
  const canModerateTopic = (forum?.priorityPosts ?? 0) > 0;
  const canDeleteTopic   = (forum?.deletePosts   ?? 0) > 0;
  const hasMod = canEditTopic || canModerateTopic || canDeleteTopic;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (isFilteringPosts) {
      // Always show the pagination dock while the user is searching — but
      // it's already hidden upstream (we don't render the dock when
      // isFilteringPosts), so we just bail out here.
      return;
    }
    const y = e.nativeEvent.contentOffset.y;
    const now = Date.now();
    const lastY = lastScrollYRef.current;
    lastScrollYRef.current = y;

    // Skip saves during the 600ms after a page change to avoid clobbering
    // the offset we just persisted with the auto scroll-to-0. Same window
    // also gates the hide-on-scroll direction detection so the page-jump
    // scroll-to-top doesn't read as "scrolling up" and force the dock open
    // unnecessarily.
    if (now - pageChangedAtRef.current < 600) return;
    if (now - sortChangedAtRef.current < 600) return;

    if (now - lastSavedScrollRef.current >= 250) {
      lastSavedScrollRef.current = now;
      useForumPaginationStore.getState().setTopicScroll(topic.id, currentPage, y);
    }

    // Direction-based hide/show. Threshold of 8px filters out micro-scrolls
    // and inertial settling. Always keep the dock visible near the very
    // top (y < 80) so the first impression of the screen includes it.
    const delta = y - lastY;
    if (delta > 8 && y > 80) {
      setPaginationHidden(true);
    } else if (delta < -8) {
      setPaginationHidden(false);
    }
  }

  const sendReaction = useCallback(
    async (post: TopicPost, code: ReactionCode) => {
      const res = await reactToThread({
        threadId:     post.id,
        forumId:      liveTopic.forumId,
        reactionType: code,
        threadLikeId: likeIdMap[post.id] ?? null,
      });

      setPendingSet(s => {
        const n = new Set(s);
        n.delete(post.id);
        return n;
      });

      if (!res.ok) {
        showToast(res.error || 'Failed to record reaction');
        return false;
      }

      if (res.threadLikeId != null && code !== 0) {
        setLikeIdMap(m => ({ ...m, [post.id]: res.threadLikeId! }));
      } else if (code === 0) {
        setLikeIdMap(m => {
          const n = { ...m };
          delete n[post.id];
          return n;
        });
      }
      if (res.likeCount != null) {
        setLikeCountMap(m => ({ ...m, [post.id]: res.likeCount! }));
      }

      // Mirror the new reaction state to MMKV so it survives remount and
      // app launches — the posts endpoint won't tell us about it on the
      // next load, so persisting here is the only way subsequent toggles
      // can pass the correct threadLikeId back to the server.
      const uid = currentUser?.userId;
      if (uid) {
        persistReaction(
          uid,
          post.id,
          code === 0 ? null : code,
          code === 0 ? null : (res.threadLikeId ?? null),
        );
      }
      return true;
    },
    [liveTopic.forumId, likeIdMap, showToast, currentUser?.userId],
  );

  const applyReaction = useCallback(
    async (post: TopicPost, next: ReactionCode | null) => {
      if (pendingSet.has(post.id)) return;

      // OP-post reactions are routed through the shared helper so the topic-
      // reactions store stays in sync with listing views (MyPostsList etc.).
      // Optimistic updates, count, and reactionJson patching live there.
      if (post.isOp) {
        setPendingSet(s => {
          const n = new Set(s);
          n.add(post.id);
          return n;
        });
        const outcome = await applyTopicReaction(liveTopic, next);
        setPendingSet(s => {
          const n = new Set(s);
          n.delete(post.id);
          return n;
        });
        if (outcome === 'auth') showToast('Please sign in to react.');
        else if (outcome === 'error') showToast('Failed to record reaction.');
        return;
      }

      const prev       = reactionMap[post.id] ?? null;
      const prevCount  = likeCountMap[post.id] ?? post.likes;
      const hadBefore  = prev != null;
      const willHave   = next != null;
      const delta      = Number(willHave) - Number(hadBefore);
      const optimistic = Math.max(0, prevCount + delta);

      setReactionMap(m => ({ ...m, [post.id]: next }));
      setLikeCountMap(m => ({ ...m, [post.id]: optimistic }));
      setPendingSet(s => {
        const n = new Set(s);
        n.add(post.id);
        return n;
      });

      const code: ReactionCode = next ?? 0;
      const ok = await sendReaction(post, code);
      if (!ok) {
        setReactionMap(m => ({ ...m, [post.id]: prev }));
        setLikeCountMap(m => ({ ...m, [post.id]: prevCount }));
      } else {
        // Patch the post's reactionJson so the aggregate emoji pill on
        // the left of the action row picks up the user's freshly-added
        // emoji immediately. parseTopReactionTypes counts entries by
        // type, so adding a new entry surfaces a new emoji in the pill
        // without a server round-trip.
        setReactionJsonMap((m) => {
          const baseJson = m[post.id] ?? post.reactionJson;
          return { ...m, [post.id]: patchReactionJson(baseJson, prev, next) };
        });
      }
    },
    [pendingSet, reactionMap, likeCountMap, sendReaction, liveTopic, showToast],
  );

  const handleOpenReactionPicker = useCallback(
    (post: TopicPost, anchor: AnchorRect) => {
      setPickerFor(post);
      setPickerAnchor(anchor);
    },
    [],
  );

  const handleClosePicker = useCallback(() => {
    setPickerFor(null);
    setPickerAnchor(null);
  }, []);

  const handlePickReaction = useCallback(
    (code: ReactionCode) => {
      const target = pickerFor;
      setPickerFor(null);
      setPickerAnchor(null);
      if (!target) return;
      const current = target.isOp
        ? opSlot.reaction
        : (reactionMap[target.id] ?? null);
      if (current === code) {
        // Show UNDO alert instead of immediately removing
        showSameReactionAlert(target.id);
        return;
      }
      prevReactionRef.current[target.id] = current;
      applyReaction(target, code);
    },
    [pickerFor, reactionMap, opSlot.reaction, applyReaction],
  );

  const handleUnreact = useCallback(
    async (postId: number) => {
      setSameReactionPostId(null);
      if (sameReactionTimer.current) clearTimeout(sameReactionTimer.current);

      const revertTo = prevReactionRef.current[postId] ?? null;
      const post = sortedPosts.find(p => p.id === postId);
      if (!post) return;
      delete prevReactionRef.current[postId];
      applyReaction(post, revertTo);
    },
    [sortedPosts, applyReaction],
  );

  const openReply = useCallback((qp: QuotedPost | null) => {
    setQuotedPost(qp);
    setReplyOpen(true);
  }, []);

  const handleReply = useCallback(
    (post: TopicPost) => {
      openReply({
        author:  post.author,
        message: stripPostHtml(post.message).slice(0, 300),
      });
    },
    [openReply],
  );

  const handleQuote = useCallback(
    (post: TopicPost) => {
      openReply({
        author:  post.author,
        message: stripPostHtml(post.message).slice(0, 300),
      });
    },
    [openReply],
  );

  // When the user tapped LIKE / REPLY / QUOTE on a TopicCard in All Topics,
  // we navigate here with autoAction set. Once the OP arrives, fire the action
  // against it — exactly once per visit.
  useEffect(() => {
    if (!autoAction || didAutoActionRef.current) return;
    if (!opPost) return;
    didAutoActionRef.current = true;
    if (autoAction === 'like') {
      if (opSlot.reaction == null) applyReaction(opPost, 1);
    } else if (autoAction === 'reply') {
      openReply(null);
    } else if (autoAction === 'quote') {
      handleQuote(opPost);
    }
  }, [autoAction, opPost, opSlot.reaction, applyReaction, openReply, handleQuote]);

  const handleEdit = useCallback((post: TopicPost) => {
    setEditingId(post.id);
    setEditText(stripPostHtml(post.message));
    setEditError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (post: TopicPost) => {
      const trimmed = editText.trim();
      if (!trimmed) {
        setEditError('Please enter a message.');
        return;
      }
      setEditSaving(true);
      setEditError(null);
      const res = await editPost({
        postId:  post.id,
        topicId: liveTopic.id,
        message: trimmed,
      });
      setEditSaving(false);
      if (res.ok) {
        setEditingId(null);
        setEditText('');
        refetch();
        showToast('Post updated');
      } else {
        setEditError(res.error || 'Failed to save edit.');
      }
    },
    [editText, liveTopic.id, refetch, showToast],
  );

  const handleModAction = useCallback(
    (action: ModActionKey) => {
      queryClient.invalidateQueries({ queryKey: ['forum-topics', liveTopic.forumId] });
      queryClient.invalidateQueries({ queryKey: ['forums-all-topics'] });
      if (action === 'trash') {
        navigation.goBack();
        return;
      }
      refetch();
    },
    [queryClient, liveTopic.forumId, navigation, refetch],
  );

  const handlePostAction = useCallback(
    (action: PostActionKey) => {
      const toast: Partial<Record<PostActionKey, string>> = {
        report:  'Report submitted.',
        trash:   'Post trashed.',
        matured: 'Matured flag updated.',
        modNote: 'Moderator note saved.',
      };
      const msg = toast[action];
      if (msg) showToast(msg);
      if (action === 'trash' || action === 'matured' || action === 'modNote') {
        refetch();
      }
    },
    [refetch, showToast],
  );

  const handlePollVote = useCallback(
    async (poll: TopicPoll, optionIds: number[]) => {
      if (pollVoting) return;
      const ids = Array.isArray(optionIds) ? optionIds : [optionIds];
      if (ids.length === 0) return;
      setPollVoting(true);
      setPollError(null);
      const res = await castPollVote(poll.pollId, ids);
      setPollVoting(false);
      if (res.ok) {
        setPollVotedIds(ids);
        setPollOverrides(m => {
          const next = { ...m };
          for (const id of ids) next[id] = (next[id] || 0) + 1;
          return next;
        });
      } else {
        setPollError(res.error || 'Failed to record vote.');
      }
    },
    [pollVoting],
  );

  const renderPost = useCallback(
    ({ item, index }: { item: TopicPost; index: number }) => {
      const isEditingThis = editingId === item.id;
      const isOp = item.isOp;
      const reaction = isOp ? opSlot.reaction : (reactionMap[item.id] ?? null);
      const likeCount = isOp
        ? (opSlot.countOverride != null ? opSlot.countOverride : item.likes)
        : (likeCountMap[item.id] ?? item.likes);

      // Live-patched reactionJson — opSlot.opPost is the patched OP from
      // useTopicLike's applyTopicReaction; reactionJsonMap is the parallel
      // for non-OP. Falls back to the server-fetched item.reactionJson when
      // there's no local patch, and we only build a new post object when
      // the JSON actually differs so React.memo on PostCard can short-
      // circuit unchanged renders.
      const patchedJson = isOp
        ? (opSlot.opPost?.reactionJson ?? item.reactionJson)
        : (reactionJsonMap[item.id] ?? item.reactionJson);
      const postForCard = patchedJson === item.reactionJson
        ? item
        : { ...item, reactionJson: patchedJson };

      return (
        <PostCard
          post={postForCard}
          index={index}
          reaction={reaction}
          likeCount={likeCount}
          pendingReaction={pendingSet.has(item.id)}
          isMine={!!currentUser && currentUser.userId === item.authorId}
          onOpenReactionPicker={handleOpenReactionPicker}
          onPressReactionSummary={setReactionsFor}
          onReply={handleReply}
          onQuote={handleQuote}
          onEdit={handleEdit}
          onPressEdited={setEditHistoryFor}
          onPressAvatar={setMiniCardFor}
          onPressSettings={setPostSheetFor}
          isEditing={isEditingThis}
          editText={isEditingThis ? editText : ''}
          editSaving={isEditingThis && editSaving}
          editError={isEditingThis ? editError : null}
          onChangeEditText={setEditText}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
        />
      );
    },
    [
      reactionMap, likeCountMap, pendingSet, currentUser,
      opSlot.reaction, opSlot.countOverride, opSlot.opPost,
      reactionJsonMap,
      handleOpenReactionPicker, handleReply, handleQuote, handleEdit,
      editingId, editText, editSaving, editError,
      handleSaveEdit, handleCancelEdit,
    ],
  );

  // Use each post's CHRONOLOGICAL position for its #N label so a post sorted
  // to the top by likes still shows the right thread number (#7 stays #7).
  // PostCard renders `#{index + 1}`, so we pass a 0-based chronological index.
  const renderReply = useCallback(
    (info: { item: TopicPost; index: number }) => {
      const chrono = postIndexMap.get(info.item.id);
      return renderPost({ item: info.item, index: chrono ?? info.index });
    },
    [renderPost, postIndexMap],
  );

  const handleToggleLock = useCallback(async () => {
    if (pollLockBusy) return;
    if (!liveTopic?.id || !liveTopic?.forumId) return;
    setPollLockBusy(true);
    setPollError(null);
    const res = liveTopic.locked
      ? await openTopic(liveTopic.id, liveTopic.forumId)
      : await closeTopic(liveTopic.id, liveTopic.forumId);
    setPollLockBusy(false);
    if (res.ok) {
      refetch();
    } else {
      setPollError(res.error || 'Failed to update topic lock state.');
    }
  }, [liveTopic?.id, liveTopic?.forumId, liveTopic?.locked, pollLockBusy, refetch]);

  const replyDisabled = liveTopic.locked;

  const searchBarRef = useRef<SearchBarHandle>(null);
  const searchBarYRef = useRef(0);

  const handleSearchPress = useCallback(() => {
    const y = searchBarYRef.current;
    if (y > 0) {
      // Scroll so the search bar sits a bit below the nav rather than flush
      // against it — gives the input some breathing room when it gains focus.
      listRef.current?.scrollToOffset({
        offset: Math.max(0, y - 8),
        animated: true,
      });
    }
    // Slight delay so focus fires after the scroll begins — keyboard rises
    // with the bar visible rather than over a still-scrolling viewport.
    setTimeout(() => searchBarRef.current?.focus(), 250);
  }, []);

  return (
    <View style={styles.screen}>
      <TopNavBack
        onBack={() => navigation.goBack()}
        rightActions={[
          replyDisabled
            ? {
                icon: 'lock-closed',
                onPress: () => {},
                label: 'Topic locked',
                disabled: true,
              }
            : {
                icon: 'create',
                onPress: () => openReply(null),
                label: 'Reply to this topic',
                primary: true,
              },
          {
            icon: 'search-outline' as const,
            onPress: handleSearchPress,
            label: 'Search posts in this topic',
          },
          ...(hasMod
            ? [{
                icon: 'ellipsis-horizontal' as const,
                onPress: () => setModSheetOpen(true),
                label: 'Moderator actions',
              }]
            : []),
        ] as TopNavAction[]}
      />

      {isLoading && !data ? (
        <LoadingState height={400} />
      ) : isError && !data ? (
        <ErrorState
          message={describeFetchError(error, "Couldn't load posts.")}
          onRetry={() => refetch()}
        />
      ) : (
        <Animated.View style={[styles.listFade, animatedListStyle]}>
        <FlatList
          ref={listRef}
          data={sortedPosts}
          extraData={sortBy}
          keyExtractor={p => String(p.id)}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={renderReply}
          // Standard FlatList — predictable layout, no recycler animations.
          // Page size is small (20 items) so virtualization isn't critical.
          windowSize={5}
          removeClippedSubviews={false}
          initialNumToRender={20}
          ListHeaderComponent={
            <>
              {/* Compact forum strip — replaces the title/breadcrumb that
                  used to live in the nav bar. Slim, single-line, gives the
                  user instant context (which forum + pinned/locked state)
                  without competing with the OP for attention. */}
              <View style={styles.forumStrip}>
                {liveTopic.forumThumbnail ? (
                  <Image
                    source={{ uri: liveTopic.forumThumbnail }}
                    style={styles.forumThumb}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.forumBadge, { backgroundColor: forumBg }]}>
                    <Text style={styles.forumEmoji}>{forumEmoji}</Text>
                  </View>
                )}
                <Text style={styles.forumName} numberOfLines={1}>
                  {liveTopic.forumName || 'Forum'}
                </Text>
                <View style={styles.badgeRow}>
                  {liveTopic.pinned && (
                    <View style={[styles.topicFlag, styles.topicFlagPinned]}>
                      <Ionicons name="pin" size={10} color="#f59e0b" />
                      <Text style={styles.topicFlagText}>Pinned</Text>
                    </View>
                  )}
                  {liveTopic.locked && (
                    <View style={[styles.topicFlag, styles.topicFlagLocked]}>
                      <Ionicons name="lock-closed" size={10} color="#dc2626" />
                      <Text style={styles.topicFlagText}>Locked</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Topic header — title + last-reply chip + poll + tags. Sits
                  above the OP so the screen reads as: forum context →
                  topic identity → starter post → engagement metrics →
                  replies. Reddit / Quora layout: title is the first thing
                  the user anchors on after entering the thread. */}
              <View style={styles.topicCard}>
                {topicFlair && (
                  <View
                    style={[
                      styles.flairChip,
                      { backgroundColor: topicFlair.bgColor },
                    ]}
                  >
                    <Text
                      style={[styles.flairText, { color: topicFlair.fgColor }]}
                    >
                      {topicFlair.name}
                    </Text>
                  </View>
                )}

                <Text style={styles.title}>{liveTopic.title}</Text>

                {!!liveTopic.lastBy && liveTopic.lastBy !== liveTopic.poster && (
                  <Pressable
                    style={styles.lastReplyChip}
                    onPress={() => listRef.current?.scrollToEnd({ animated: true })}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to last reply by ${liveTopic.lastBy}`}
                  >
                    <Ionicons
                      name="arrow-down-circle-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.lastReplyText} numberOfLines={1}>
                      Last reply by{' '}
                      <Text style={styles.lastReplyName}>{liveTopic.lastBy}</Text>
                      {liveTopic.lastTime ? ` · ${liveTopic.lastTime}` : ''}
                    </Text>
                  </Pressable>
                )}

                {displayPoll && (
                  <PollWidget
                    poll={displayPoll}
                    voted={pollVoted}
                    votedIds={pollVotedIds || displayPoll.myVotedIds || []}
                    voting={pollVoting}
                    error={pollError}
                    onVote={(optIds) => displayPoll && handlePollVote(displayPoll, optIds)}
                    locked={!!liveTopic.locked}
                    lockBusy={pollLockBusy}
                    onToggleLock={handleToggleLock}
                  />
                )}

                {liveTopic.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {liveTopic.tags.map(t => (
                      <View key={t.id} style={styles.tag}>
                        <Text style={styles.tagText}>#{t.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* OP rendered immediately after the topic header — the
                  starter post is a discussion entry-point, sized as a
                  regular reply card so it doesn't dominate the screen. */}
              {opPost ? renderPost({ item: opPost, index: 0 }) : null}

              {/* Combined meta + sort row — avatars · stats · sort all in
                  one strip. Saves ~50px vs the previous two-row stack while
                  keeping the same information density. When the user is
                  searching, the cluster collapses to a "Results · N" label
                  so the row keeps a stable height. */}
              <View style={styles.metaSection}>
                {postSearch.trim() ? (
                  <Text style={styles.metaResultsLabel}>
                    Results
                    <Text style={styles.metaResultsCount}> · {sortedPosts.length}</Text>
                  </Text>
                ) : (
                  <>
                    {topPosters.length > 0 && (
                      <Pressable
                        style={styles.contributorsCluster}
                        onPress={() => setContributorsOpen(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`${topPosters.length} contributors. Tap to view all.`}
                      >
                        <AvatarCluster posters={topPosters} maxVisible={3} />
                      </Pressable>
                    )}
                    <View style={styles.metaStatsCluster}>
                      <View style={styles.metaStat}>
                        <Ionicons
                          name="chatbubbles-outline"
                          size={13}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.metaStatValue}>
                          {formatCount(liveTopic.replies ?? 0)}
                        </Text>
                      </View>
                      <View style={styles.metaStat}>
                        <Ionicons
                          name="eye-outline"
                          size={13}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.metaStatValue}>
                          {formatCount(liveTopic.views ?? 0)}
                        </Text>
                      </View>
                      <View style={styles.metaStat}>
                        <Ionicons
                          name="heart-outline"
                          size={13}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.metaStatValue}>
                          {formatCount(liveTopic.likes ?? 0)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.metaSpacer} />
                    <Pressable
                      onPress={toggleSort}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.sortChip,
                        pressed && styles.sortChipPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Sort: ${sortBy === 'date' ? 'Latest' : 'Top'}. Tap to switch.`}
                    >
                      <Ionicons
                        name={sortBy === 'date' ? 'time-outline' : 'trending-up-outline'}
                        size={13}
                        color={colors.primary}
                      />
                      <Text style={styles.sortChipText}>
                        {sortBy === 'date' ? 'Latest' : 'Top'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>

              <View
                onLayout={(e) => {
                  searchBarYRef.current = e.nativeEvent.layout.y;
                }}
              >
                <SearchBar
                  ref={searchBarRef}
                  value={postSearch}
                  onChangeText={setPostSearch}
                  placeholder="Search posts in this topic…"
                />
              </View>

            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No replies yet</Text>
              {!liveTopic.locked && (
                <Text style={styles.emptySub}>Be the first to share your thoughts!</Text>
              )}
            </View>
          }
          ListFooterComponent={
            isFetching ? (
              <View style={styles.footerSpinner}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: tabBarHeight + 110 }}
        />
        </Animated.View>
      )}

      {toast && (
        <Pressable style={styles.toast} onPress={() => setToast(null)}>
          <Text style={styles.toastText} numberOfLines={2}>{toast}</Text>
        </Pressable>
      )}

      {sameReactionPostId != null && (
        <View style={styles.undoBar}>
          <Text style={styles.undoBarText}>You already reacted with this.</Text>
          <Pressable style={styles.undoBtn} onPress={() => handleUnreact(sameReactionPostId)}>
            <Text style={styles.undoBtnText}>UNDO</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => setSameReactionPostId(null)}>
            <Ionicons name="close" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {!isFilteringPosts && (
        <View style={[styles.paginationDock, { bottom: tabBarHeight }]} pointerEvents="box-none">
          <ForumPaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={TOPIC_POSTS_PAGE_SIZE}
            totalItems={totalPostCount}
            itemLabel="posts"
            hidden={paginationHidden}
            onPageChange={handleJumpToPage}
          />
        </View>
      )}

      <ReplyComposerSheet
        visible={replyOpen}
        topic={liveTopic}
        quotedPost={quotedPost}
        onClose={() => { setReplyOpen(false); setQuotedPost(null); }}
        onSubmitted={() => {
          setReplyOpen(false);
          setQuotedPost(null);
          refetch();
        }}
      />

      <ReactionPickerSheet
        visible={pickerFor != null}
        anchor={pickerAnchor}
        current={
          pickerFor
            ? (pickerFor.isOp ? opSlot.reaction : (reactionMap[pickerFor.id] ?? null))
            : null
        }
        onPick={handlePickReaction}
        onClose={handleClosePicker}
      />

      <ReactionsSheet
        visible={reactionsFor != null}
        post={reactionsFor}
        onClose={() => setReactionsFor(null)}
      />

      <UserMiniCard
        visible={miniCardFor != null}
        post={miniCardFor}
        onClose={() => setMiniCardFor(null)}
      />

      <PostEditHistoryModal
        visible={editHistoryFor != null}
        postId={editHistoryFor?.id ?? null}
        onClose={() => setEditHistoryFor(null)}
      />

      <TopicModActionsSheet
        visible={modSheetOpen}
        topic={liveTopic}
        canEdit={canEditTopic}
        canModerate={canModerateTopic}
        canDelete={canDeleteTopic}
        onClose={() => setModSheetOpen(false)}
        onActionComplete={handleModAction}
      />

      <PostModActionsSheet
        visible={postSheetFor != null}
        post={postSheetFor}
        topicId={liveTopic.id}
        forumId={liveTopic.forumId}
        isOwner={!!currentUser && !!postSheetFor && currentUser.userId === postSheetFor.authorId}
        isModerator={hasMod}
        onClose={() => setPostSheetFor(null)}
        onEdit={(p) => { setPostSheetFor(null); handleEdit(p); }}
        onShowHistory={(p) => { setPostSheetFor(null); setEditHistoryFor(p); }}
        onActionComplete={handlePostAction}
      />

      <FrequentPostersSheet
        visible={contributorsOpen}
        posters={topPosters}
        onClose={() => setContributorsOpen(false)}
      />

      <JumpToPageSheet
        visible={jumpSheetOpen}
        currentPage={currentPage}
        totalPages={totalPages}
        label="posts"
        onClose={() => setJumpSheetOpen(false)}
        onJump={handleJumpToPage}
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    listFade: {
      flex: 1,
    },
    paginationDock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    forumStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    topicCard: {
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    forumThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    forumBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    forumEmoji: {
      fontSize: 13,
    },
    forumName: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      flexShrink: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
      marginLeft: 'auto',
    },
    topicFlag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    // Tonal accent dropped from the original filled badges — kept for any
    // legacy callers but unused on this screen now.
    topicFlagPinned: {},
    topicFlagLocked: {},
    topicFlagText: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.2,
    },
    flairChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 8,
    },
    flairText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text,
      lineHeight: 24,
      letterSpacing: -0.2,
    },
    authorChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    authorAvatarImg: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.surface,
    },
    authorAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    authorLetter: {
      color: c.onPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    authorInfo: {
      flex: 1,
    },
    authorName: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
    },
    authorTime: {
      fontSize: 10,
      color: c.textTertiary,
      marginTop: 1,
    },
    lastReplyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
      alignSelf: 'flex-start',
    },
    lastReplyText: {
      fontSize: 11,
      color: c.textSecondary,
      flexShrink: 1,
    },
    lastReplyName: {
      fontWeight: '700',
      color: c.text,
    },
    description: {
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
      marginTop: 12,
    },
    topicImage: {
      width: '100%',
      height: 180,
      borderRadius: 10,
      marginTop: 12,
      backgroundColor: c.surface,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },
    tag: {
      backgroundColor: c.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    tagText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.primary,
    },
    metaSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 9,
      gap: 10,
      minHeight: 42,
    },
    metaSpacer: {
      flex: 1,
    },
    metaResultsLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.1,
    },
    metaResultsCount: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textTertiary,
    },
    contributorsCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
    },
    metaStatsCluster: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexShrink: 1,
    },
    metaStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaStatValue: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.1,
    },
    sortChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    sortChipPressed: {
      opacity: 0.8,
    },
    sortChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.1,
    },
    empty: {
      alignItems: 'center',
      padding: 40,
      gap: 6,
    },
    emptyIcon: {
      fontSize: 36,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    emptySub: {
      fontSize: 12,
      color: c.textTertiary,
    },
    footerSpinner: {
      paddingVertical: 12,
    },
    toast: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 78,
      backgroundColor: c.text,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    toastText: {
      color: c.card,
      fontSize: 12,
      fontWeight: '600',
    },
    undoBar: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 78,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    undoBarText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: c.text,
    },
    undoBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: c.primary,
    },
    undoBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.onPrimary,
    },
  });
}
