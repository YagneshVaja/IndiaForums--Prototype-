import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import type { CelebrityFan } from '../../../services/api';
import FanCard from './FanCard';
import Spinner from './Spinner';
import ErrorBlock from './ErrorBlock';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  fans: CelebrityFan[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

export default function FansTab({
  fans,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (isLoading) return <Spinner text="Loading fans..." />;
  if (isError)   return <ErrorBlock message="Couldn't load fans" onRetry={onRetry} />;
  if (fans.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🫶</Text>
        <Text style={styles.emptyText}>No fans yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={fans}
      keyExtractor={(f) => f.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => <FanCard fan={item} />}
      ListFooterComponent={
        hasNextPage ? (
          <Pressable style={styles.loadMore} onPress={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.loadMoreText}>Load more fans</Text>
            )}
          </Pressable>
        ) : null
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { padding: 14, gap: 10 },
    row:     { gap: 10, marginBottom: 10 },
    empty:   { alignItems: 'center', padding: 40, gap: 10 },
    emptyIcon: { fontSize: 36 },
    emptyText: { fontSize: 13, color: c.textSecondary },
    loadMore: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.primary,
      marginTop: 6,
    },
    loadMoreText: { color: c.primary, fontWeight: '700', fontSize: 13 },
  });
}
