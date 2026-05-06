import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, ScrollView, StyleSheet,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack } from '../../../components/layout/TopNavBar';
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
import SearchBar from '../components/SearchBar';
import JumpToPageSheet from '../components/JumpToPageSheet';
import ForumPaginationBar from '../components/ForumPaginationBar';
import { useTopicPosts, TOPIC_POSTS_PAGE_SIZE } from '../hooks/useTopicPosts';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import { useForumPaginationStore, selectTopicPage } from '../store/forumPaginationStore';
import { useTopicTopPosters } from '../hooks/useTopicTopPosters';
import { applyTopicReaction, seedOpPost } from '../hooks/useTopicLike';
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
  buildUserAvatarUrl,
  type ForumTopic, type ReactionCode, type TopicPost, type TopicPoll,
} from '../../../services/api';

type Styles = ReturnType<typeof makeStyles>;

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'TopicDetail'>;
type Rt  = RouteProp<ForumsStackParamList, 'TopicDetail'>;

const STICKY_THRESHOLD = 110;

export default function TopicDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { topic, forum, jumpToLast, autoAction } = useRoute<Rt>().params;
  const currentUser = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [replyOpen, setReplyOpen] = useState(false);
  const [quotedPost, setQuotedPost] = useState<QuotedPost | null>(null);

  const [reactionMap, setReactionMap]   = useState<Record<number, ReactionCode | null>>({});
  const [likeIdMap, setLikeIdMap]       = useState<Record<number, number>>({});
  const [likeCountMap, setLikeCountMap] = useState<Record<number, number>>({});
  const [pendingSet, setPendingSet]     = useState<Set<number>>(new Set());

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
  const [stickyVisible, setStickyVisible] = useState(false);
  const persistedTopicPage = useForumPaginationStore(selectTopicPage(topic.id));
  const [currentPage, setCurrentPage] = useState(persistedTopicPage);
  const [jumpSheetOpen, setJumpSheetOpen] = useState(false);
  const lastSavedScrollRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPostSearch(postSearch.trim()), 100);
    return () => clearTimeout(t);
  }, [postSearch]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modSheetOpen, setModSheetOpen] = useState(false);
  const [postSheetFor, setPostSheetFor] = useState<TopicPost | null>(null);

  const listRef = useRef<React.ElementRef<typeof FlashList<TopicPost>>>(null);
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
  } = useTopicPosts(topic.id, debouncedPostSearch, currentPage);

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

  // OP rendered separately at the top of the list (right after the title) so
  // the page sequence matches the live website:
  //   Title → OP post → Stats → Frequent Posters → Sort/Search → Replies
  const opPost = useMemo<TopicPost | null>(
    () => allPosts.find(p => p.isOp) ?? null,
    [allPosts],
  );

  // Replies = everything except the OP. Search/sort applies only to replies.
  const sortedPosts = useMemo<TopicPost[]>(() => {
    const liveQuery = postSearch.trim().toLowerCase();
    let replies = allPosts.filter(p => !p.isOp);

    if (liveQuery) {
      const serverInSync = debouncedPostSearch.toLowerCase() === liveQuery;
      if (!serverInSync) {
        replies = replies.filter(p => {
          const msg = (p.message || '').toLowerCase();
          const author = (p.author || '').toLowerCase();
          return msg.includes(liveQuery) || author.includes(liveQuery);
        });
      }
    }

    if (sortBy === 'likes') {
      replies = [...replies].sort(
        (a, b) => (likeCountMap[b.id] ?? b.likes ?? 0) - (likeCountMap[a.id] ?? a.likes ?? 0),
      );
    }

    return replies;
  }, [allPosts, sortBy, likeCountMap, postSearch, debouncedPostSearch]);

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

  const isFilteringPosts = sortBy === 'likes' || postSearch.trim().length > 0;

  const { hidden: barHidden, onScroll: handlePagOnScroll } = useHideOnScroll();

  const handleJumpToPage = useCallback((page: number) => {
    setJumpSheetOpen(false);
    setCurrentPage(page);
    useForumPaginationStore.getState().setTopicPage(topic.id, page);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [topic.id]);

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
    const y = e.nativeEvent.contentOffset.y;
    const shouldShow = y > STICKY_THRESHOLD;
    if (shouldShow !== stickyVisible) setStickyVisible(shouldShow);
    if (!isFilteringPosts) {
      handlePagOnScroll(e);
      const now = Date.now();
      if (now - lastSavedScrollRef.current >= 250) {
        lastSavedScrollRef.current = now;
        useForumPaginationStore.getState().setTopicScroll(topic.id, currentPage, y);
      }
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
      return true;
    },
    [liveTopic.forumId, likeIdMap, showToast],
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
      return (
        <PostCard
          post={item}
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
      opSlot.reaction, opSlot.countOverride,
      handleOpenReactionPicker, handleReply, handleQuote, handleEdit,
      editingId, editText, editSaving, editError,
      handleSaveEdit, handleCancelEdit,
    ],
  );

  // FlashList items are reply posts; offset their index by +1 so post numbers
  // continue from the OP (which renders at "#1" in the header).
  const renderReply = useCallback(
    (info: { item: TopicPost; index: number }) =>
      renderPost({ item: info.item, index: info.index + 1 }),
    [renderPost],
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

  return (
    <View style={styles.screen}>
      <TopNavBack
        title={liveTopic.forumName || 'Topic'}
        onBack={() => navigation.goBack()}
        rightIcon={hasMod ? 'ellipsis-horizontal' : undefined}
        onRightPress={hasMod ? () => setModSheetOpen(true) : undefined}
        rightAccessibilityLabel="Moderator actions"
      />

      {stickyVisible && (
        <View style={styles.sticky}>
          {liveTopic.forumThumbnail ? (
            <Image
              source={{ uri: liveTopic.forumThumbnail }}
              style={styles.stickyThumb}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.stickyThumbFallback, { backgroundColor: forumBg }]}>
              <Text style={styles.stickyEmoji}>{forumEmoji}</Text>
            </View>
          )}
          <View style={styles.stickyText}>
            <Text style={styles.stickyForum} numberOfLines={1}>
              {liveTopic.forumName || 'Forum'}
            </Text>
            <Text style={styles.stickyTitle} numberOfLines={1}>
              {liveTopic.title}
            </Text>
          </View>
        </View>
      )}

      {isLoading && !data ? (
        <LoadingState height={400} />
      ) : isError && !data ? (
        <ErrorState
          message={describeFetchError(error, "Couldn't load posts.")}
          onRetry={() => refetch()}
        />
      ) : (
        <FlashList
          ref={listRef}
          data={sortedPosts}
          keyExtractor={p => String(p.id)}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={renderReply}
          ListHeaderComponent={
            <>
              <View style={styles.topicCard}>
                <View style={styles.forumRow}>
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
                        <Ionicons name="pin" size={10} color="#FFFFFF" />
                        <Text style={styles.topicFlagText}>Pinned</Text>
                      </View>
                    )}
                    {liveTopic.locked && (
                      <View style={[styles.topicFlag, styles.topicFlagLocked]}>
                        <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                        <Text style={styles.topicFlagText}>Locked</Text>
                      </View>
                    )}
                  </View>
                </View>

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

                {/*
                  No "Started by X" author chip — the OP post itself is rendered
                  immediately below this header card and shows full author info
                  (avatar, name, group, time, badges). Matches the live website.
                */}

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

                {/*
                  Description, topic image, and social embeds were rendered here
                  but they duplicated the OP post (which is rendered as the first
                  item of the FlashList below and shows the exact same content).
                  Polls live only on the topic-level pollDetail payload, so we
                  still render the poll widget here.
                */}

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

              {/* OP post rendered here — directly under the title, matching the */}
              {/* live website's sequence: Title → OP → Stats → Frequent Posters → Replies. */}
              {opPost && renderPost({ item: opPost, index: 0 })}

              {/* 6-cell stats grid — matches the live website's "Created /
                  Last reply / Replies / Views / Users / Likes" row, with the
                  OP and last-replier avatars rendered inline. */}
              <View style={styles.statGrid}>
                <StatBlock
                  label="Created"
                  value={liveTopic.time}
                  avatarUrl={liveTopic.posterId > 0 ? buildUserAvatarUrl(liveTopic.posterId) : null}
                  styles={styles}
                />
                <StatBlock
                  label="Last reply"
                  value={liveTopic.lastTime || '—'}
                  avatarUrl={liveTopic.lastById > 0 ? buildUserAvatarUrl(liveTopic.lastById) : null}
                  styles={styles}
                />
                <StatBlock
                  label="Replies"
                  value={formatCount(liveTopic.replies ?? 0)}
                  styles={styles}
                />
                <StatBlock
                  label="Views"
                  value={formatCount(liveTopic.views ?? 0)}
                  styles={styles}
                />
                <StatBlock
                  label="Users"
                  value={formatCount(liveTopic.userCount ?? 0)}
                  styles={styles}
                />
                <StatBlock
                  label="Likes"
                  value={formatCount(liveTopic.likes ?? 0)}
                  styles={styles}
                />
              </View>

              {topPosters.length > 0 && (
                <View style={styles.postersWrap}>
                  <Text style={styles.postersTitle}>Frequent Posters</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.postersScroll}
                  >
                    {topPosters.map(p => (
                      <View key={p.userId} style={styles.posterCol}>
                        <View style={styles.posterAvatarWrap}>
                          {p.avatarUrl ? (
                            <Image
                              source={{ uri: p.avatarUrl }}
                              style={styles.posterAvatar}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={150}
                            />
                          ) : (
                            <View style={[styles.posterAvatar, styles.posterAvatarFallback]}>
                              <Text style={styles.posterInitial}>
                                {(p.userName || 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.posterCountBadge}>
                            <Text style={styles.posterCountText}>
                              {formatCount(p.postCount)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <SearchBar
                value={postSearch}
                onChangeText={setPostSearch}
                placeholder="Search posts in this topic…"
              />

              {(sortedPosts.length > 0 || postSearch.trim()) && (
                <View style={styles.sortRow}>
                  <View style={styles.sectionLabel}>
                    <Text style={styles.sectionText}>
                      {postSearch.trim() ? 'Results' : 'Replies'}
                    </Text>
                    <View style={styles.sectionCount}>
                      <Text style={styles.sectionCountText}>
                        {sortedPosts.length}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sortSpacer} />
                  {!postSearch.trim() && (
                    <>
                      <Pressable
                        style={[styles.sortBtn, sortBy === 'date' && styles.sortBtnActive]}
                        onPress={() => setSortBy('date')}
                      >
                        <Text style={[styles.sortBtnText, sortBy === 'date' && styles.sortBtnTextActive]}>
                          Latest
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.sortBtn, sortBy === 'likes' && styles.sortBtnActive]}
                        onPress={() => setSortBy('likes')}
                      >
                        <Text style={[styles.sortBtnText, sortBy === 'likes' && styles.sortBtnTextActive]}>
                          Top
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}

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
          contentContainerStyle={styles.content}
        />
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
        <View style={styles.paginationDock} pointerEvents="box-none">
          <ForumPaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={TOPIC_POSTS_PAGE_SIZE}
            totalItems={totalPostCount}
            itemLabel="posts"
            hidden={barHidden}
            onPageChange={handleJumpToPage}
            onOpenJumpSheet={() => setJumpSheetOpen(true)}
          />
        </View>
      )}

      {replyDisabled ? (
        <View style={styles.lockedBar}>
          <Ionicons name="lock-closed" size={13} color={colors.textTertiary} />
          <Text style={styles.lockedBarText}>This topic is locked</Text>
        </View>
      ) : (
        <Pressable style={styles.replyBar} onPress={() => openReply(null)}>
          {currentUser?.userId ? (
            <Image
              source={{ uri: buildUserAvatarUrl(currentUser.userId) ?? '' }}
              style={styles.replyAvatarImg}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={styles.replyAvatar}>
              <Text style={styles.replyAvatarLetter}>
                {(currentUser?.userName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.replyInput}>
            <Text style={styles.replyInputPlaceholder}>Reply to this topic…</Text>
          </View>
          <View style={styles.sendBtn}>
            <Ionicons name="send" size={14} color="#FFFFFF" />
          </View>
        </Pressable>
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

function StatBlock({ label, value, avatarUrl, styles }: {
  label: string;
  value: string;
  avatarUrl?: string | null;
  styles: Styles;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statBlockLabel}>{label}</Text>
      <View style={styles.statBlockValueRow}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.statBlockAvatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}
        <Text style={styles.statBlockValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function MetaItem({ icon, value, label, styles, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  styles: Styles;
  color: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

function StatCell({ icon, value, label, styles, iconColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  styles: Styles;
  iconColor: string;
}) {
  return (
    <View style={styles.statCell}>
      <View style={styles.statRow}>
        <Ionicons name={icon} size={13} color={iconColor} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: {
      paddingBottom: 150,
    },
    paginationDock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 56,
    },
    sticky: {
      position: 'absolute',
      top: 44,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      zIndex: 10,
    },
    stickyThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    stickyThumbFallback: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stickyEmoji: {
      fontSize: 11,
    },
    stickyText: {
      flex: 1,
      minWidth: 0,
    },
    stickyForum: {
      fontSize: 10,
      fontWeight: '700',
      color: c.primary,
    },
    stickyTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.text,
    },
    topicCard: {
      backgroundColor: c.card,
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    forumRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
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
      borderRadius: 8,
    },
    topicFlagPinned: {
      backgroundColor: '#f59e0b',
    },
    topicFlagLocked: {
      backgroundColor: '#dc2626',
    },
    topicFlagText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
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
      fontSize: 21,
      fontWeight: '800',
      color: c.text,
      lineHeight: 28,
      letterSpacing: -0.3,
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
      gap: 6,
      backgroundColor: c.surface,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      marginTop: 8,
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
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    statGrid: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 14,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    statBlock: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 4,
      gap: 4,
      minWidth: 0,
    },
    statBlockLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: c.textTertiary,
      letterSpacing: 0.2,
    },
    statBlockValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexShrink: 1,
    },
    statBlockAvatar: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.surface,
    },
    statBlockValue: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      flexShrink: 1,
    },
    postersWrap: {
      backgroundColor: c.card,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    postersTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.1,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    postersScroll: {
      paddingHorizontal: 14,
      gap: 12,
    },
    posterCol: {
      alignItems: 'center',
    },
    posterAvatarWrap: {
      position: 'relative',
    },
    posterAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.surface,
    },
    posterAvatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    posterInitial: {
      color: c.onPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    posterCountBadge: {
      position: 'absolute',
      right: -3,
      bottom: -3,
      paddingHorizontal: 5,
      minWidth: 20,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    posterCountText: {
      fontSize: 9,
      fontWeight: '800',
      color: c.textSecondary,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaValue: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
    },
    metaLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textTertiary,
    },
    metaDot: {
      fontSize: 12,
      color: c.textTertiary,
      marginHorizontal: 2,
    },
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
    },
    statLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statDivider: {
      width: 1,
      height: 22,
      backgroundColor: c.border,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bg,
    },
    sectionLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    sectionText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.1,
    },
    sectionCount: {
      backgroundColor: c.surface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    sectionCountText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textSecondary,
    },
    sortSpacer: {
      flex: 1,
    },
    sortBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'transparent',
    },
    sortBtnActive: {
      backgroundColor: c.primary,
    },
    sortBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textTertiary,
    },
    sortBtnTextActive: {
      color: c.onPrimary,
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
    replyBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    replyAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    replyAvatarImg: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
    },
    replyAvatarLetter: {
      color: c.onPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    replyInput: {
      flex: 1,
      backgroundColor: c.bg,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    replyInputPlaceholder: {
      fontSize: 13,
      color: c.textTertiary,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockedBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    lockedBarText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textTertiary,
    },
  });
}
