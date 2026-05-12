import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import SectionHeader from '../../../components/ui/SectionHeader';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import {
  fetchMovieCast,
  fetchMovieReviews,
  fetchMovieDiscussionTopics,
  type Movie,
  type MovieMode,
} from '../../../services/api';

import FeaturedMovieCard from '../components/FeaturedMovieCard';
import MoviePosterCard from '../components/MoviePosterCard';
import MoviesGridSkeleton from '../components/MoviesGridSkeleton';
import { useMovies } from '../hooks/useMovies';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Movies'>;

const TABS: { id: MovieMode; label: string }[] = [
  { id: 'latest',   label: 'Latest Releases' },
  { id: 'upcoming', label: 'Upcoming Movies' },
];

const FEATURED_COUNT = 6;

export default function MoviesScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const [mode, setMode] = useState<MovieMode>('latest');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMovies(mode);

  const allMovies = useMemo<Movie[]>(
    () => (data?.pages || []).flatMap((p) => p.movies),
    [data],
  );
  const totalCount = data?.pages?.[0]?.totalCount ?? 0;

  const featured = useMemo(() => allMovies.slice(0, FEATURED_COUNT), [allMovies]);
  const grid     = useMemo(() => allMovies.slice(FEATURED_COUNT), [allMovies]);

  const handlePress = useCallback(
    (movie: Movie) => {
      // Warm the cache for the detail screen the moment the user taps. By
      // the time the navigation transition completes (~150ms) and they're
      // looking at the hero, /cast and /reviews are usually back. Discussion
      // (which can cold-start at ~12s on the backend's first call per cycle)
      // gets a head-start equal to however long the user reads the page —
      // by the time they scroll there, it's likely already loaded.
      queryClient.prefetchQuery({
        queryKey: ['movie', movie.titleId, 'cast'],
        queryFn:  () => fetchMovieCast(movie.titleId, 1, 12),
        staleTime: 5 * 60 * 1000,
      });
      queryClient.prefetchQuery({
        queryKey: ['movie', movie.titleId, 'reviews'],
        queryFn:  () => fetchMovieReviews(movie.titleId, 5, 5),
        staleTime: 5 * 60 * 1000,
      });
      queryClient.prefetchQuery({
        queryKey: ['movieDiscussion', movie.titleName, 6],
        queryFn:  () => fetchMovieDiscussionTopics(movie.titleName, 6),
        staleTime: 5 * 60 * 1000,
      });
      navigation.navigate('MovieDetail', { movie });
    },
    [navigation, queryClient],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((m: Movie) => String(m.titleId), []);
  const renderItem = useCallback(
    ({ item }: { item: Movie }) => (
      <View style={styles.cell}>
        <MoviePosterCard movie={item} onPress={handlePress} />
      </View>
    ),
    [handlePress, styles.cell],
  );

  const activeTabLabel = TABS.find((t) => t.id === mode)?.label ?? '';

  const ListHeader = useMemo(() => {
    if (featured.length === 0) return null;
    return (
      <View>
        {totalCount > 0 ? (
          <Text style={styles.totalLabel}>
            {totalCount.toLocaleString('en-IN')} {mode === 'upcoming' ? 'titles upcoming' : 'titles released'}
          </Text>
        ) : null}

        <SectionHeader title="Featured" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredRow}
        >
          {featured.map((m) => (
            <FeaturedMovieCard key={`f-${m.titleId}`} movie={m} onPress={handlePress} />
          ))}
        </ScrollView>

        <SectionHeader title={`All ${activeTabLabel}`} />
      </View>
    );
  }, [featured, totalCount, mode, activeTabLabel, handlePress, styles.totalLabel, styles.featuredRow]);

  return (
    <View style={styles.screen}>
      <TopNavBack title="Movies" onBack={() => navigation.goBack()} />

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = t.id === mode;
          return (
            <Pressable
              key={t.id}
              onPress={() => setMode(t.id)}
              style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading && allMovies.length === 0 ? (
        <MoviesGridSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load movies" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={grid}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEnd}
          onEndReachedThreshold={0.6}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            featured.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎬</Text>
                <Text style={styles.emptyTitle}>
                  {mode === 'upcoming' ? 'No upcoming movies announced' : 'No movies found'}
                </Text>
                {mode === 'upcoming' ? (
                  <>
                    <Text style={styles.emptyText}>
                      The schedule is empty right now. Check back soon for new releases — or browse what's already out.
                    </Text>
                    <Pressable
                      onPress={() => setMode('latest')}
                      style={styles.emptyCta}
                      accessibilityRole="button"
                    >
                      <Text style={styles.emptyCtaText}>See Latest Releases</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    tabRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 8,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    tabActive: { backgroundColor: c.text, borderColor: c.text },
    tabInactive: { backgroundColor: c.card, borderColor: c.border },
    tabText: { fontSize: 12.5, fontWeight: '700' },
    tabTextActive: { color: c.card },
    tabTextInactive: { color: c.textSecondary },

    listContent: {
      paddingTop: 0,
      paddingBottom: 32,
    },
    gridRow: {
      gap: 10,
      paddingHorizontal: 12,
      marginBottom: 14,
    },
    cell: { flex: 1 },

    totalLabel: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      fontSize: 12,
      fontWeight: '600',
      color: c.textTertiary,
    },
    featuredRow: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      gap: 14,
    },

    empty: { paddingHorizontal: 32, paddingTop: 56, paddingBottom: 32, alignItems: 'center' },
    emptyEmoji: { fontSize: 44, marginBottom: 10 },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    emptyText: {
      color: c.textSecondary,
      fontSize: 13.5,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 320,
    },
    emptyCta: {
      marginTop: 18,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 22,
      backgroundColor: c.primary,
    },
    emptyCtaText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    footer: { paddingVertical: 18 },
  });
}
