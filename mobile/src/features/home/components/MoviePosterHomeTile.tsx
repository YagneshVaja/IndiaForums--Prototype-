import React, { memo, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Movie } from '../../../services/api';

interface Props {
  movie: Movie;
  onPress: (movie: Movie) => void;
}

const FALLBACK_GRADIENTS: { bg: string; accent: string }[] = [
  { bg: '#1F2A44', accent: '#FFB347' },
  { bg: '#3A1F22', accent: '#FF6B6B' },
  { bg: '#1A3A2E', accent: '#84E1BC' },
  { bg: '#2E1B3A', accent: '#C39BD3' },
  { bg: '#3A2E1A', accent: '#F5CB5C' },
  { bg: '#172A3A', accent: '#7CC4FF' },
];

function formatReleaseDate(
  iso: string | null,
  fallbackYear: number | null,
): string | null {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return fallbackYear ? String(fallbackYear) : null;
}

function MoviePosterHomeTileImpl({ movie, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [imgFailed, setImgFailed] = useState(false);

  const released = formatReleaseDate(movie.releaseDate, movie.startYear);
  const showMeter = movie.criticRatingCount > 0 || movie.audienceRatingCount > 0;
  const meterValue =
    movie.criticRatingCount > 0 ? movie.criticRating : movie.audienceRating;
  const fb = FALLBACK_GRADIENTS[movie.titleId % FALLBACK_GRADIENTS.length];
  const showFallback = !movie.posterUrl || imgFailed;

  return (
    <Pressable
      onPress={() => onPress(movie)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
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
          <View
            style={[
              styles.poster,
              styles.posterFallback,
              { backgroundColor: fb.bg },
            ]}
          >
            <Text style={[styles.fallbackEmoji, { color: fb.accent }]}>🎬</Text>
            <Text style={styles.fallbackTitle} numberOfLines={3}>
              {movie.titleName}
            </Text>
          </View>
        )}

        {showMeter ? (
          <View style={styles.meterBadge}>
            <Text style={styles.meterValue}>{Math.round(meterValue)}%</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {movie.titleName}
      </Text>
      {released ? (
        <Text style={styles.release} numberOfLines={1}>
          {released}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default memo(MoviePosterHomeTileImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      width: 132,
    },
    pressed: { opacity: 0.78 },
    posterWrap: {
      width: '100%',
      aspectRatio: 2 / 3,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: c.cardElevated,
    },
    poster: { width: '100%', height: '100%' },
    posterFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 12,
    },
    fallbackEmoji: { fontSize: 28, marginBottom: 6, opacity: 0.9 },
    fallbackTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
      textAlign: 'center',
      lineHeight: 15,
    },
    meterBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.78)',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    meterValue: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    title: {
      marginTop: 7,
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      lineHeight: 16,
    },
    release: {
      marginTop: 2,
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '500',
    },
  });
}
