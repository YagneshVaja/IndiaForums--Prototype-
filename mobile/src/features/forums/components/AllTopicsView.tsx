import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useQueryClient } from '@tanstack/react-query';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';

import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import BrandRefreshIndicator from '../../../components/ui/BrandPullToRefresh';
import { describeFetchError } from '../../../services/fetchError';
import SortDropdown, { type SortMode } from './SortDropdown';
import ViewToggle, { type ViewMode } from './ViewToggle';
import TopicCard from './TopicCard';
import ReplyComposerSheet, { type QuotedPost } from './ReplyComposerSheet';
import ReactionPickerSheet, { type AnchorRect } from './ReactionPickerSheet';
import ReactionsSheet from './ReactionsSheet';
import { useAllForumTopics } from '../hooks/useAllForumTopics';
import { applyTopicReaction, ensureOpPost } from '../hooks/useTopicLike';
import { useTopicReactionsStore } from '../store/topicReactionsStore';
import { formatCount } from '../utils/format';
import { stripPostHtml } from '../utils/stripHtml';
import type { ForumTopic, ReactionCode, TopicPost } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  onTopicPress?: (
    topic: ForumTopic,
    opts?: { jumpToLast?: boolean; autoAction?: 'like' | 'reply' | 'quote' },
  ) => void;
  topInset?: number;
}

export default function AllTopicsView({ onTopicPress, topInset = 0 }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const tabBarHeight = useBottomTabBarHeight();
  const { applyScroll: applyChromeScroll, resetChrome } = useScrollChrome();

  const listScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyChromeScroll(e);
    },
  });

  const [composerTopic, setComposerTopic] = useState<ForumTopic | null>(null);
  const [composerQuote, setComposerQuote] = useState<QuotedPost | null>(null);
  const [pickerTopic, setPickerTopic]   = useState<ForumTopic | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<AnchorRect | null>(null);
  const [reactionsListPost, setReactionsListPost] = useState<TopicPost | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickerCurrent = useTopicReactionsStore(
    (s) => (pickerTopic ? s.byTopicId[pickerTopic.id]?.reaction ?? null : null),
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const handleReply = useCallback((topic: ForumTopic) => {
    setComposerTopic(topic);
    setComposerQuote(null);
  }, []);

  const handleQuote = useCallback((topic: ForumTopic) => {
    setComposerTopic(topic);
    const excerpt = stripPostHtml(topic.description).slice(0, 300);
    setComposerQuote({ author: topic.poster, message: excerpt });
  }, []);

  const handleComposerClose = useCallback(() => {
    setComposerTopic(null);
    setComposerQuote(null);
  }, []);

  const handleComposerSubmitted = useCallback(() => {
    setComposerTopic(null);
    setComposerQuote(null);
    showToast('Reply posted.');
    queryClient.invalidateQueries({ queryKey: ['forums-all-topics'] });
    if (composerTopic) {
      queryClient.invalidateQueries({ queryKey: ['topic-posts', composerTopic.id] });
    }
  }, [queryClient, composerTopic, showToast]);

  const handleOpenReactionPicker = useCallback(
    (topic: ForumTopic, anchor: AnchorRect) => {
      setPickerTopic(topic);
      setPickerAnchor(anchor);
    },
    [],
  );

  const handleClosePicker = useCallback(() => {
    setPickerTopic(null);
    setPickerAnchor(null);
  }, []);

  const handlePickReaction = useCallback(
    async (code: ReactionCode) => {
      const target = pickerTopic;
      setPickerTopic(null);
      setPickerAnchor(null);
      if (!target) return;
      const currentSlot = useTopicReactionsStore.getState().byTopicId[target.id];
      const current = currentSlot?.reaction ?? null;
      // Tapping the active reaction again removes it (matches PostCard behavior).
      const next: ReactionCode | null = current === code ? null : code;
      const outcome = await applyTopicReaction(target, next);
      if (outcome === 'auth') showToast('Sign in to react to this topic.');
      else if (outcome === 'error') showToast('Could not record your reaction. Try again.');
    },
    [pickerTopic, showToast],
  );

  const handleOpenReactionsList = useCallback(
    async (topic: ForumTopic) => {
      const cached = useTopicReactionsStore.getState().byTopicId[topic.id]?.opPost;
      if (cached) {
        setReactionsListPost(cached);
        return;
      }
      const op = await ensureOpPost(topic);
      if (op) setReactionsListPost(op);
      else showToast('Could not load reactions.');
    },
    [showToast],
  );

  const handleCloseReactionsList = useCallback(() => setReactionsListPost(null), []);

  const {
    data,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAllForumTopics();

  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const topics = useMemo<ForumTopic[]>(
    () => (data?.pages || []).flatMap(p => p.topics),
    [data],
  );

  const sortedTopics = useMemo(() => {
    if (sortMode === 'popular') {
      return [...topics].sort((a, b) => b.views - a.views);
    }
    return topics;
  }, [topics, sortMode]);

  if (isLoading && !data) return <LoadingState height={400} />;
  if (isError && !data) return (
    <ErrorState
      message={describeFetchError(error, "Couldn't load topics.")}
      onRetry={() => refetch()}
    />
  );

  return (
    <View style={styles.wrap}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Animated.FlatList
        data={sortedTopics}
        keyExtractor={t => String(t.id)}
        renderItem={({ item }) => (
          <TopicCard
            topic={item}
            viewMode={viewMode}
            onPress={onTopicPress}
            onReply={handleReply}
            onQuote={handleQuote}
            onOpenReactionPicker={handleOpenReactionPicker}
            onOpenReactionsList={handleOpenReactionsList}
          />
        )}
        onScroll={listScrollHandler as any}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              resetChrome();
              refetch();
            }}
            // OS spinner hidden — BrandRefreshIndicator paints on top.
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            progressViewOffset={topInset}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.sortBar}>
            <SortDropdown mode={sortMode} onChange={setSortMode} />
            <View style={styles.sortRight}>
              <Text style={styles.countText}>{formatCount(totalCount)} topics</Text>
              <ViewToggle mode={viewMode} onChange={setViewMode} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No topics yet</Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.content,
          topInset > 0 && { paddingTop: topInset },
          { paddingBottom: tabBarHeight + 24 },
        ]}
      />

      {composerTopic && (
        <ReplyComposerSheet
          visible
          topic={composerTopic}
          quotedPost={composerQuote}
          onClose={handleComposerClose}
          onSubmitted={handleComposerSubmitted}
        />
      )}

      <ReactionPickerSheet
        visible={pickerTopic != null}
        anchor={pickerAnchor}
        current={pickerCurrent}
        onPick={handlePickReaction}
        onClose={handleClosePicker}
      />

      <ReactionsSheet
        visible={reactionsListPost != null}
        post={reactionsListPost}
        onClose={handleCloseReactionsList}
      />

      {toast && (
        <Pressable style={styles.toast} onPress={() => setToast(null)}>
          <Text style={styles.toastText} numberOfLines={2}>{toast}</Text>
        </Pressable>
      )}

      <BrandRefreshIndicator refreshing={isRefetching} topInset={topInset} />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
    },
    content: {
    },
    sortBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
    },
    sortRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    countText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
    },
    empty: {
      alignItems: 'center',
      padding: 40,
      gap: 8,
    },
    emptyIcon: {
      fontSize: 36,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    footer: {
      paddingVertical: 16,
    },
    toast: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 24,
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
  });
}
