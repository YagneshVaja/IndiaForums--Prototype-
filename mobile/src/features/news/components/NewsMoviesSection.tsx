import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import type { Movie } from '../../../services/api';
import MoviePosterCard from '../../movies/components/MoviePosterCard';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import RailHeader from './RailHeader';

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
  const styles = useThemedStyles(makeStyles);

  if (movies.length === 0) return null;

  return (
    <View style={styles.section}>
      <RailHeader icon="film-outline" title="Trending Movies" onSeeAll={onSeeAll} />
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
    scroll: { paddingHorizontal: 14, gap: 12 },
    // MoviePosterCard uses `flex: 1` so it grows to fill its slot. Wrapping in
    // a fixed-width view gives it a poster-shaped footprint inside a
    // horizontal rail.
    cardSlot: { width: 120 },
  });
}
