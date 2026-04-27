import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';

import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import { describeFetchError } from '../../../services/fetchError';
import SortDropdown, { type SortMode } from './SortDropdown';
import ViewToggle, { type ViewMode } from './ViewToggle';
import TopicCard from './TopicCard';
import { useAllForumTopics } from '../hooks/useAllForumTopics';
import { formatCount } from '../utils/format';
import type { ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  onTopicPress?: (
    topic: ForumTopic,
    opts?: { jumpToLast?: boolean; autoAction?: 'like' | 'reply' | 'quote' },
  ) => void;
}

export default function AllTopicsView({ onTopicPress }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    data,
    isLoading,
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
    <FlatList
      data={sortedTopics}
      keyExtractor={t => String(t.id)}
      renderItem={({ item }) => (
        <TopicCard topic={item} viewMode={viewMode} onPress={onTopicPress} />
      )}
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
      contentContainerStyle={styles.content}
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingBottom: 24,
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
  });
}
