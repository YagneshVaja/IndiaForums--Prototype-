import React, { useMemo, useState } from 'react';
import {
  View, Text, Image, Pressable, FlatList, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import PostCard from '../components/PostCard';
import ReplyComposerSheet from '../components/ReplyComposerSheet';
import { useTopicPosts } from '../hooks/useTopicPosts';
import { stripPostHtml } from '../utils/stripHtml';
import type { ForumsStackParamList } from '../../../navigation/types';
import { reactToThread } from '../../../services/api';
import type { ForumTopic, TopicPost } from '../../../services/api';

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'TopicDetail'>;
type Rt  = RouteProp<ForumsStackParamList, 'TopicDetail'>;

export default function TopicDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { topic, forum } = useRoute<Rt>().params;

  const [replyOpen, setReplyOpen] = useState(false);
  const [likedMap, setLikedMap]         = useState<Record<number, boolean>>({});
  const [likeIdMap, setLikeIdMap]       = useState<Record<number, number>>({});
  const [likeCountMap, setLikeCountMap] = useState<Record<number, number>>({});
  const [pendingSet, setPendingSet]     = useState<Set<number>>(new Set());

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

  const description = useMemo(
    () => stripPostHtml(liveTopic.description),
    [liveTopic.description],
  );

  const forumBg    = forum?.bg    ?? '#3558F0';
  const forumEmoji = forum?.emoji ?? '💬';

  async function handleToggleLike(post: TopicPost) {
    if (pendingSet.has(post.id)) return;

    const wasLiked    = likedMap[post.id] ?? false;
    const prevCount   = likeCountMap[post.id] ?? post.likes;
    const nextLiked   = !wasLiked;
    const optimistic  = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setLikedMap(m => ({ ...m, [post.id]: nextLiked }));
    setLikeCountMap(m => ({ ...m, [post.id]: optimistic }));
    setPendingSet(s => {
      const n = new Set(s);
      n.add(post.id);
      return n;
    });

    const res = await reactToThread({
      threadId:     post.id,
      forumId:      liveTopic.forumId,
      reactionType: nextLiked ? 1 : 0,
      threadLikeId: likeIdMap[post.id] ?? null,
    });

    setPendingSet(s => {
      const n = new Set(s);
      n.delete(post.id);
      return n;
    });

    if (!res.ok) {
      // rollback
      setLikedMap(m => ({ ...m, [post.id]: wasLiked }));
      setLikeCountMap(m => ({ ...m, [post.id]: prevCount }));
      return;
    }

    if (res.threadLikeId != null && nextLiked) {
      setLikeIdMap(m => ({ ...m, [post.id]: res.threadLikeId! }));
    } else if (!nextLiked) {
      setLikeIdMap(m => {
        const n = { ...m };
        delete n[post.id];
        return n;
      });
    }
    if (res.likeCount != null) {
      setLikeCountMap(m => ({ ...m, [post.id]: res.likeCount! }));
    }
  }

  return (
    <View style={styles.screen}>
      <TopNavBack title={liveTopic.forumName || 'Topic'} onBack={() => navigation.goBack()} />

      {isLoading && !data ? (
        <LoadingState height={400} />
      ) : isError && !data ? (
        <ErrorState message="Couldn't load posts" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={allPosts}
          keyExtractor={p => String(p.id)}
          renderItem={({ item, index }) => (
            <PostCard
              post={item}
              index={index}
              liked={likedMap[item.id] ?? false}
              likeCount={likeCountMap[item.id] ?? item.likes}
              pendingReaction={pendingSet.has(item.id)}
              onToggleLike={handleToggleLike}
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={styles.topicCard}>
              <View style={styles.forumRow}>
                {liveTopic.forumThumbnail ? (
                  <Image source={{ uri: liveTopic.forumThumbnail }} style={styles.forumThumb} />
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
                <Image source={{ uri: liveTopic.topicImage }} style={styles.topicImage} />
              )}

              <View style={styles.stats}>
                <Ionicons name="chatbubble-outline" size={13} color="#8A8A8A" />
                <Text style={styles.statsText}>{liveTopic.replies} replies</Text>
                <Text style={styles.statsDot}>·</Text>
                <Ionicons name="eye-outline" size={13} color="#8A8A8A" />
                <Text style={styles.statsText}>{liveTopic.views} views</Text>
              </View>
            </View>
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
              <View style={styles.footer}>
                <ActivityIndicator color="#3558F0" />
              </View>
            ) : null
          }
          contentContainerStyle={styles.content}
        />
      )}

      {!liveTopic.locked && (
        <Pressable style={styles.fab} onPress={() => setReplyOpen(true)}>
          <Ionicons name="create" size={18} color="#FFFFFF" />
          <Text style={styles.fabText}>Reply</Text>
        </Pressable>
      )}

      <ReplyComposerSheet
        visible={replyOpen}
        topic={liveTopic}
        onClose={() => setReplyOpen(false)}
        onSubmitted={() => {
          setReplyOpen(false);
          refetch();
        }}
      />
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
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
  },
  statsDot: {
    fontSize: 11,
    color: '#C0C0C0',
    marginHorizontal: 2,
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
  footer: {
    paddingVertical: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: '#3558F0',
    shadowColor: '#3558F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
