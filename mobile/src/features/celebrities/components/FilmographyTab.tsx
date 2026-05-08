import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { Movie } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import FilmographyRow from './FilmographyRow';
import Spinner from './Spinner';
import ErrorBlock from './ErrorBlock';

interface Props {
  movies: Movie[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

export default function FilmographyTab({
  movies, isLoading, isError, hasNextPage, isFetchingNextPage, onLoadMore, onRetry,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (isLoading) return <Spinner text="Loading filmography..." />;
  if (isError)   return <ErrorBlock message="Couldn't load filmography" onRetry={onRetry} />;
  if (movies.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyText}>No filmography listed</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={movies}
      keyExtractor={(m) => String(m.titleId)}
      renderItem={({ item }) => <FilmographyRow movie={item} />}
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
    emptyText: { fontSize: 13, color: c.textSecondary },
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
