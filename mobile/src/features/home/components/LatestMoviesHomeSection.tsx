import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Movie } from '../../../services/api';
import { useMovies } from '../../movies/hooks/useMovies';
import MoviePosterHomeTile from './MoviePosterHomeTile';

const PREVIEW_COUNT = 10;
const SKELETON_COUNT = 4;

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function LatestMoviesHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, isError } = useMovies('latest');

  const previewMovies = useMemo<Movie[]>(
    () => (data?.pages?.[0]?.movies ?? []).slice(0, PREVIEW_COUNT),
    [data],
  );

  const handleMoviePress = useCallback(
    (movie: Movie) => navigation.navigate('MovieDetail', { movie }),
    [navigation],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('Movies'),
    [navigation],
  );

  if (isError && !previewMovies.length) return null;
  if (!isLoading && !previewMovies.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>LATEST MOVIES</Text>
            <Text style={styles.subtitle}>
              New releases · ratings & reviews
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [
            styles.seeAll,
            pressed && styles.seeAllPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="See all movies"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading && !previewMovies.length ? (
        <View style={styles.skeletonRow}>
          {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
            <View key={`sk-${idx}`} style={styles.skeletonCell}>
              <View style={[styles.skeleton, styles.skeletonPoster]} />
              <View style={[styles.skeleton, styles.skeletonLine]} />
              <View style={[styles.skeleton, styles.skeletonLineShort]} />
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {previewMovies.map((movie) => (
            <MoviePosterHomeTile
              key={movie.titleId}
              movie={movie}
              onPress={handleMoviePress}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 10,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    accentBar: {
      width: 3.5,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    titleCol: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    seeAllPressed: { opacity: 0.6 },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },

    row: {
      paddingHorizontal: 14,
      gap: 12,
      flexDirection: 'row',
    },
    skeletonRow: {
      paddingHorizontal: 14,
      gap: 12,
      flexDirection: 'row',
    },
    skeletonCell: {
      width: 132,
    },
    skeleton: {
      backgroundColor: c.surface,
      borderRadius: 6,
    },
    skeletonPoster: {
      width: '100%',
      aspectRatio: 2 / 3,
      borderRadius: 10,
      marginBottom: 7,
    },
    skeletonLine: {
      height: 11,
      width: '90%',
      marginTop: 4,
    },
    skeletonLineShort: {
      height: 9,
      width: '50%',
      marginTop: 6,
    },
  });
}
