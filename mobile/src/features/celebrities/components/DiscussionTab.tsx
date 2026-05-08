import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import ForumTopicRow from './ForumTopicRow';
import Spinner from './Spinner';
import ErrorBlock from './ErrorBlock';

interface Props {
  forumId: number | null;
  bioLoading: boolean;
  topics: ForumTopic[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

export default function DiscussionTab({
  forumId, bioLoading, topics, isLoading, isError,
  hasNextPage, isFetchingNextPage, onLoadMore, onRetry,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (bioLoading) return <Spinner text="Loading discussion..." />;
  if (!forumId || forumId <= 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>No discussion forum for this celebrity yet</Text>
      </View>
    );
  }
  if (isLoading) return <Spinner text="Loading discussion..." />;
  if (isError)   return <ErrorBlock message="Couldn't load discussion" onRetry={onRetry} />;
  if (topics.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>No topics yet</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={topics}
      keyExtractor={(t) => String(t.id)}
      renderItem={({ item }) => <ForumTopicRow topic={item} />}
      contentContainerStyle={styles.content}
      ListFooterComponent={
        hasNextPage ? (
          <Pressable style={styles.loadMore} onPress={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.loadMoreText}>Load more</Text>}
          </Pressable>
        ) : null
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { paddingVertical: 12 },
    empty: { alignItems: 'center', padding: 40, gap: 10 },
    emptyIcon: { fontSize: 36 },
    emptyText: { fontSize: 13, color: c.textSecondary, textAlign: 'center' },
    loadMore: {
      alignSelf: 'center',
      marginTop: 6,
      marginHorizontal: 14,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.primary,
    },
    loadMoreText: { color: c.primary, fontWeight: '700', fontSize: 13 },
  });
}
