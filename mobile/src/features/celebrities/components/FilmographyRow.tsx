import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { Movie } from '../../../services/api';
import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  movie: Movie;
}

const TITLE_TYPE_LABEL: Record<number, string> = {
  1: 'Movie',
  2: 'Short Film',
  3: 'TV Show',
  4: 'Web Series',
};

function FilmographyRowImpl({ movie }: Props) {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const rating = movie.averageRating > 0
    ? movie.averageRating
    : movie.audienceRating > 0
      ? movie.audienceRating
      : movie.criticRating > 0
        ? movie.criticRating
        : null;

  const subtitleParts: string[] = [];
  if (movie.startYear) subtitleParts.push(String(movie.startYear));
  const typeLabel = TITLE_TYPE_LABEL[movie.titleTypeId];
  if (typeLabel) subtitleParts.push(typeLabel);

  return (
    <Pressable
      onPress={() => navigation.navigate('MovieDetail', { movie })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={movie.titleName}
    >
      {movie.posterUrl ? (
        <Image source={{ uri: movie.posterUrl }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Ionicons name="film-outline" size={22} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{movie.titleName}</Text>
        {subtitleParts.length > 0 && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitleParts.join(' · ')}</Text>
        )}
        {rating != null && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#F5A623" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const FilmographyRow = React.memo(FilmographyRowImpl);
export default FilmographyRow;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 14,
      marginBottom: 8,
      padding: 10,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
    poster: { width: 60, height: 80, borderRadius: 8, backgroundColor: c.surface },
    posterPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 4 },
    title: { fontSize: 14, fontWeight: '700', color: c.text, lineHeight: 18 },
    subtitle: { fontSize: 12, color: c.textSecondary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    ratingText: { fontSize: 12, color: c.text, fontWeight: '600' },
  });
}
