import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Movie } from '../../../services/api';
import MoviePosterCard from '../../movies/components/MoviePosterCard';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  movies: Movie[];
  onMoviePress?: (movie: Movie) => void;
  onSeeAll?: () => void;
}

// Trending-movies rail injected into the News feed every ~5th block. Visual
// chrome matches NewsVideoSection / NewsGallerySection so the feed reads as
// one designed surface across all rail types. Reuses MoviePosterCard from
// the movies feature so poster + rating treatment stays consistent.
function NewsMoviesSectionImpl({ movies, onMoviePress, onSeeAll }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  if (movies.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="film-outline" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Trending Movies</Text>
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>See All →</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {movies.map((m) => (
          <View key={m.titleId} style={styles.cardSlot}>
            <MoviePosterCard
              movie={m}
              onPress={(mv) => onMoviePress?.(mv)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const NewsMoviesSection = React.memo(NewsMoviesSectionImpl);
export default NewsMoviesSection;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      paddingVertical: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginVertical: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    seeAll: { fontSize: 12, fontWeight: '700', color: c.primary },
    scroll: { paddingHorizontal: 14, gap: 12 },
    // MoviePosterCard uses `flex: 1` so it grows to fill its slot. Wrapping in
    // a fixed-width view gives it a poster-shaped footprint inside a
    // horizontal rail.
    cardSlot: { width: 120 },
  });
}
