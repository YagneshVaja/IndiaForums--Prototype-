import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet,
  Alert, Share, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import PostCard from '../components/PostCard';
import ReplyComposerSheet, { type QuotedPost } from '../components/ReplyComposerSheet';
import ReactionPickerSheet from '../components/ReactionPickerSheet';
import ReactionsSheet from '../components/ReactionsSheet';
import UserMiniCard from '../components/UserMiniCard';
import PostEditHistoryModal from '../components/PostEditHistoryModal';
import PollWidget from '../components/PollWidget';
import SocialEmbed from '../components/SocialEmbed';
import { useTopicPosts } from '../hooks/useTopicPosts';
import { stripPostHtml } from '../utils/stripHtml';
import { extractSocialUrls, stripSocialUrlsFromText } from '../utils/socialUrls';
import { formatCount } from '../utils/format';
import { useAuthStore } from '../../../store/authStore';
import type { ForumsStackParamList } from '../../../navigation/types';
import {
  reactToThread, trashPost, editPost, castPollVote,
  type ForumTopic, type ReactionCode, type TopicPost, type TopicPoll,
} from '../../../services/api';

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'TopicDetail'>;
type Rt  = RouteProp<ForumsStackParamList, 'TopicDetail'>;

const STICKY_THRESHOLD = 110;

export default function TopicDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { topic, forum } = useRoute<Rt>().params;
  const currentUser = useAuthStore(s => s.user);

  const [replyOpen, setReplyOpen] = useState(false);
  const [quotedPost, setQuotedPost] = useState<QuotedPost | null>(null);

  const [reactionMap, setReactionMap]   = useState<Record<number, ReactionCode | null>>({});
  const [likeIdMap, setLikeIdMap]       = useState<Record<number, number>>({});
  const [likeCountMap, setLikeCountMap] = useState<Record<number, number>>({});
  const [pendingSet, setPendingSet]     = useState<Set<number>>(new Set());

  const [pickerFor, setPickerFor] = useState<TopicPost | null>(null);
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
  const [pollOverrides, setPollOverrides] = useState<Record<number, number>>({});

  const [sortBy, setSortBy] = useState<'date' | 'likes'>('date');
  const [stickyVisible, setStickyVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTopicPosts(topic.id);

  const firstPage = data?.pages[0];
  const liveTopic: ForumTopic = firstPage?.topicDetail
    ? { ...topic, ...firstPage.topicDetail }
    : topic;

  const allPosts = useMemo<TopicPost[]>(
    () => (data?.pages || []).flatMap(p => p.posts),
    [data],
  );

  const sortedPosts = useMemo<TopicPost[]>(() => {
    if (sortBy !== 'likes') return allPosts;
    return [...allPosts].sort(
      (a, b) => (likeCountMap[b.id] ?? b.likes ?? 0) - (likeCountMap[a.id] ?? a.likes ?? 0),
    );
  }, [allPosts, sortBy, likeCountMap]);

  const description = useMemo(
    () => stripSocialUrlsFromText(stripPostHtml(liveTopic.description)),
    [liveTopic.description],
  );

  const topicSocialUrls = useMemo(
    () => extractSocialUrls(liveTopic.description),
    [liveTopic.description],
  );

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

  const canModerate =
    ((forum?.priorityPosts ?? 0) > 0) ||
    ((forum?.editPosts     ?? 0) > 0) ||
    ((forum?.deletePosts   ?? 0) > 0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const shouldShow = y > STICKY_THRESHOLD;
    if (shouldShow !== stickyVisible) setStickyVisible(shouldShow);
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
    [pendingSet, reactionMap, likeCountMap, sendReaction],
  );

  const handleQuickReact = useCallback(
    (post: TopicPost) => {
      const current = reactionMap[post.id] ?? null;
      applyReaction(post, current === 1 ? null : 1);
    },
    [reactionMap, applyReaction],
  );

  const handleLongPressReact = useCallback((post: TopicPost) => {
    setPickerFor(post);
  }, []);

  const handlePickReaction = useCallback(
    (code: ReactionCode) => {
      const target = pickerFor;
      setPickerFor(null);
      if (!target) return;
      const current = reactionMap[target.id] ?? null;
      if (current === code) {
        showToast('Reaction removed');
        applyReaction(target, null);
        return;
      }
      applyReaction(target, code);
    },
    [pickerFor, reactionMap, showToast, applyReaction],
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

  const handlePollVote = useCallback(
    async (poll: TopicPoll, optionId: number) => {
      if (pollVoting) return;
      setPollVoting(true);
      setPollError(null);
      const res = await castPollVote(poll.pollId, [optionId]);
      setPollVoting(false);
      if (res.ok) {
        setPollVotedIds([optionId]);
        setPollOverrides(m => ({ ...m, [optionId]: (m[optionId] || 0) + 1 }));
      } else {
        setPollError(res.error || 'Failed to record vote.');
      }
    },
    [pollVoting],
  );

  const handleShare = useCallback(async (post: TopicPost) => {
    try {
      await Share.share({
        message: `"${post.author}" on IndiaForums: ${stripPostHtml(post.message).slice(0, 200)}`,
      });
    } catch {
      // User dismissed share sheet.
    }
  }, []);

  const handleTrash = useCallback(
    (post: TopicPost) => {
      Alert.alert(
        'Trash this post?',
        'It will be moved to the trash topic.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Trash',
            style: 'destructive',
            onPress: async () => {
              const res = await trashPost({ threadId: post.id, topicId: liveTopic.id });
              if (res.ok) refetch();
              else showToast(res.error || 'Failed to trash post');
            },
          },
        ],
      );
    },
    [liveTopic.id, refetch, showToast],
  );

  const replyDisabled = liveTopic.locked;

  return (
    <View style={styles.screen}>
      <TopNavBack title={liveTopic.forumName || 'Topic'} onBack={() => navigation.goBack()} />

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
        <ErrorState message="Couldn't load posts" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={sortedPosts}
          keyExtractor={p => String(p.id)}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <PostCard
              post={item}
              index={index}
              reaction={reactionMap[item.id] ?? null}
              likeCount={likeCountMap[item.id] ?? item.likes}
              pendingReaction={pendingSet.has(item.id)}
              isMine={!!currentUser && currentUser.userId === item.authorId}
              canModerate={canModerate}
              onQuickReact={handleQuickReact}
              onLongPressReact={handleLongPressReact}
              onPressReactionSummary={setReactionsFor}
              onReply={handleReply}
              onQuote={handleQuote}
              onEdit={handleEdit}
              onShare={handleShare}
              onTrash={handleTrash}
              onPressEdited={setEditHistoryFor}
              onPressAvatar={setMiniCardFor}
              isEditing={editingId === item.id}
              editText={editingId === item.id ? editText : ''}
              editSaving={editingId === item.id && editSaving}
              editError={editingId === item.id ? editError : null}
              onChangeEditText={setEditText}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
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
                        <Ionicons name="bookmark" size={10} color="#FFFFFF" />
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

                <Text style={styles.title}>{liveTopic.title}</Text>

                <View style={styles.authorChip}>
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorLetter}>
                      {(liveTopic.poster || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>{liveTopic.poster}</Text>
                    <Text style={styles.authorTime}>{liveTopic.time}</Text>
                  </View>
                </View>

                {!!description && (
                  <Text style={styles.description}>{description}</Text>
                )}

                {liveTopic.topicImage && (
                  <Image
                    source={{ uri: liveTopic.topicImage }}
                    style={styles.topicImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                )}

                {topicSocialUrls.map(u => (
                  <SocialEmbed key={u} url={u} />
                ))}

                {displayPoll && (
                  <PollWidget
                    poll={displayPoll}
                    voted={pollVoted}
                    votedIds={pollVotedIds || []}
                    voting={pollVoting}
                    error={pollError}
                    onVote={(optId) => displayPoll && handlePollVote(displayPoll, optId)}
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

              <View style={styles.statsBar}>
                <StatCell
                  icon="chatbubble-outline"
                  value={formatCount(liveTopic.replies ?? 0)}
                  label="Replies"
                />
                <View style={styles.statDivider} />
                <StatCell
                  icon="eye-outline"
                  value={formatCount(liveTopic.views ?? 0)}
                  label="Views"
                />
                <View style={styles.statDivider} />
                <StatCell
                  icon="heart-outline"
                  value={formatCount(liveTopic.likes ?? 0)}
                  label="Likes"
                />
              </View>

              {sortedPosts.length > 0 && (
                <View style={styles.sortRow}>
                  <View style={styles.sectionLabel}>
                    <Text style={styles.sectionText}>Replies</Text>
                    <View style={styles.sectionCount}>
                      <Text style={styles.sectionCountText}>{sortedPosts.length}</Text>
                    </View>
                  </View>
                  <View style={styles.sortSpacer} />
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
            isFetchingNextPage ? (
              <View style={styles.footerSpinner}>
                <ActivityIndicator color="#3558F0" />
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

      {replyDisabled ? (
        <View style={styles.lockedBar}>
          <Ionicons name="lock-closed" size={13} color="#8A8A8A" />
          <Text style={styles.lockedBarText}>This topic is locked</Text>
        </View>
      ) : (
        <Pressable style={styles.replyBar} onPress={() => openReply(null)}>
          <View style={styles.replyAvatar}>
            <Text style={styles.replyAvatarLetter}>?</Text>
          </View>
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
        current={pickerFor ? (reactionMap[pickerFor.id] ?? null) : null}
        onPick={handlePickReaction}
        onClose={() => setPickerFor(null)}
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
    </View>
  );
}

function StatCell({ icon, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCell}>
      <View style={styles.statRow}>
        <Ionicons name={icon} size={13} color="#8A8A8A" />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  content: {
    paddingBottom: 90,
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF1',
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
    color: '#3558F0',
  },
  stickyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  topicCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF1',
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
    color: '#3558F0',
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 24,
  },
  authorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3558F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorLetter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  authorTime: {
    fontSize: 10,
    color: '#8A8A8A',
    marginTop: 1,
  },
  description: {
    fontSize: 14,
    color: '#2A2A2A',
    lineHeight: 20,
    marginTop: 12,
  },
  topicImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: '#EEEFF1',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3558F0',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF1',
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
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E2E2',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionCount: {
    backgroundColor: '#EEEFF1',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5A5A5A',
  },
  sortSpacer: {
    flex: 1,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  sortBtnActive: {
    backgroundColor: '#3558F0',
    borderColor: '#3558F0',
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A5A5A',
  },
  sortBtnTextActive: {
    color: '#FFFFFF',
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
    color: '#1A1A1A',
  },
  emptySub: {
    fontSize: 12,
    color: '#8A8A8A',
  },
  footerSpinner: {
    paddingVertical: 16,
  },
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 78,
    backgroundColor: '#1A1A1A',
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEFF1',
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3558F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAvatarLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F5F6F7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  replyInputPlaceholder: {
    fontSize: 13,
    color: '#9A9A9A',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3558F0',
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEFF1',
  },
  lockedBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A8A',
  },
});
