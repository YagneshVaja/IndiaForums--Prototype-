import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';

import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import { describeFetchError } from '../../../services/fetchError';
import SearchBar from './SearchBar';
import TopicCard from './TopicCard';
import { useMyPosts } from '../hooks/useMyPosts';
import type { ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  onTopicPress?: (topic: ForumTopic) => void;
}

export default function MyPostsList({ onTopicPress }: Props) {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Debounce the server query — avoid refetching on every keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => setSubmitted(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyPosts(true, submitted);

  const totalCount = data?.pages[0]?.totalRecordCount ?? 0;
  const topics = useMemo<ForumTopic[]>(() => {
    const seen = new Set<number>();
    const out: ForumTopic[] = [];
    for (const p of data?.pages ?? []) {
      for (const t of p.topics) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        out.push(t);
      }
    }
    return out;
  }, [data]);

  if (isLoading && !data) return <LoadingState height={400} />;
  if (isError && !data) return (
    <ErrorState
      message={describeFetchError(error, "Couldn't load your posts.")}
      onRetry={() => refetch()}
    />
  );

  return (
    <FlatList
      data={topics}
      keyExtractor={t => String(t.id)}
      renderItem={({ item }) => (
        <TopicCard topic={item} viewMode="detailed" onPress={onTopicPress} />
      )}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search your posts..."
          />
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {totalCount.toLocaleString()} TOPICS
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✍️</Text>
          <Text style={styles.emptyTitle}>
            {submitted ? 'No matches' : 'You haven’t posted yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {submitted
              ? 'Try a different search term.'
              : 'Topics you reply to will appear here.'}
          </Text>
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
    countRow: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
    },
    countText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.5,
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
    emptySubtitle: {
      fontSize: 12,
      color: c.textTertiary,
      textAlign: 'center',
    },
    footer: {
      paddingVertical: 16,
    },
  });
}
