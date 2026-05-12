import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { Movie } from '../../../services/api';

interface Props {
  movie: Movie;
  onPress: (movie: Movie) => void;
}

function formatReleaseDate(iso: string | null, fallbackYear: number | null): string | null {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return fallbackYear ? String(fallbackYear) : null;
}

// Pick a deterministic background per titleId so missing-poster fallbacks
// don't all collapse to the same flat colour.
const FALLBACK_GRADIENTS: { bg: string; accent: string }[] = [
  { bg: '#1F2A44', accent: '#FFB347' },
  { bg: '#3A1F22', accent: '#FF6B6B' },
  { bg: '#1A3A2E', accent: '#84E1BC' },
  { bg: '#2E1B3A', accent: '#C39BD3' },
  { bg: '#3A2E1A', accent: '#F5CB5C' },
  { bg: '#172A3A', accent: '#7CC4FF' },
];

function FeaturedMovieCardImpl({ movie, onPress }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [imgFailed, setImgFailed] = useState(false);

  const released = formatReleaseDate(movie.releaseDate, movie.startYear);
  const showMeter = movie.criticRatingCount > 0 || movie.audienceRatingCount > 0;
  const meterValue = movie.criticRatingCount > 0 ? movie.criticRating : movie.audienceRating;
  const fb = FALLBACK_GRADIENTS[movie.titleId % FALLBACK_GRADIENTS.length];
  const showFallback = !movie.posterUrl || imgFailed;

  return (
    <Pressable
      onPress={() => onPress(movie)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={movie.titleName}
    >
      <View style={styles.posterWrap}>
        {!showFallback ? (
          <Image
            source={{ uri: movie.posterUrl as string }}
            style={styles.poster}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={[styles.poster, styles.posterFallback, { backgroundColor: fb.bg }]}>
            <Text style={[styles.fallbackEmoji, { color: fb.accent }]}>🎬</Text>
            <Text style={styles.fallbackTitle} numberOfLines={3}>{movie.titleName}</Text>
            {released ? <Text style={styles.fallbackYear}>{released}</Text> : null}
          </View>
        )}
        {showMeter ? (
          <View style={styles.meterBadge}>
            <Text style={styles.meterLabel}>IF MOVIE METER</Text>
            <Text style={styles.meterValue}>{Math.round(meterValue)}%</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>{movie.titleName}</Text>
      {released ? <Text style={styles.release} numberOfLines={1}>{released}</Text> : null}

      <View style={styles.ratingRow}>
        <Text style={styles.ratingLine} numberOfLines={1}>
          <Text style={styles.ratingLabel}>Critic's Rating: </Text>
          <Text style={styles.ratingNumber}>
            {movie.criticRatingCount > 0 ? `${Math.round(movie.criticRating)}%` : '—'}
          </Text>
          <Text style={styles.ratingMeta}>
            {movie.criticRatingCount > 0 ? ` (${movie.criticRatingCount})` : ''}
          </Text>
        </Text>
        <Text style={styles.ratingLine} numberOfLines={1}>
          <Text style={styles.ratingLabel}>User Rating: </Text>
          <Text style={styles.ratingNumber}>
            {movie.audienceRatingCount > 0 ? `${Math.round(movie.audienceRating)}%` : '—'}
          </Text>
          <Text style={styles.ratingMeta}>
            {movie.audienceRatingCount > 0 ? ` (${movie.audienceRatingCount})` : ''}
          </Text>
        </Text>
      </View>
    </Pressable>
  );
}

const FeaturedMovieCard = React.memo(FeaturedMovieCardImpl);
export default FeaturedMovieCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: 180,
    },
    pressed: { opacity: 0.75 },
    posterWrap: {
      width: '100%',
      aspectRatio: 2 / 3,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: c.cardElevated,
    },
    poster: { width: '100%', height: '100%' },
    posterFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    fallbackEmoji: { fontSize: 36, marginBottom: 8, opacity: 0.9 },
    fallbackTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 18,
    },
    fallbackYear: {
      marginTop: 6,
      fontSize: 11,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '700',
    },
    meterBadge: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      backgroundColor: 'rgba(0,0,0,0.78)',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
    },
    meterLabel: {
      color: '#FFD56B',
      fontSize: 8.5,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    meterValue: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 18,
    },
    title: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
    },
    release: {
      marginTop: 2,
      fontSize: 11.5,
      color: c.textTertiary,
      fontWeight: '600',
    },
    ratingRow: {
      marginTop: 6,
      gap: 1,
    },
    ratingLine: { fontSize: 11, lineHeight: 15 },
    ratingLabel:  { color: c.textSecondary, fontWeight: '600' },
    ratingNumber: { color: c.text, fontWeight: '800' },
    ratingMeta:   { color: c.textTertiary },
  });
}
