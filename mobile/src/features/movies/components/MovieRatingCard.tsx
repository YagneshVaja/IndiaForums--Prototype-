import React from 'react';
import { View, Text, Pressable, StyleSheet, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { Movie, MovieReview } from '../../../services/api';
import type { HomeStackParamList } from '../../../navigation/types';
import StarRow from './StarRow';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  movie: Movie;
  /** Hides Rate / Write a Review when the user has already reviewed this
   *  movie — edit + delete live on their own review card instead. */
  ownReview?: MovieReview | null;
}

function MovieRatingCardImpl({ movie, ownReview }: Props) {
  const navigation = useNavigation<Nav>();
  const styles = useThemedStyles(makeStyles);

  const showCritic = movie.criticRatingCount > 0;
  const showUser = movie.audienceRatingCount > 0;
  const hasOwnReview = !!ownReview;

  const handleWriteReview = () => {
    navigation.navigate('WriteMovieReview', {
      titleId: movie.titleId,
      titleName: movie.titleName,
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${movie.titleName} on IndiaForums — https://www.indiaforums.com/movie/${movie.pageUrl}_${movie.titleId}`,
      });
    } catch {
      // user cancelled — no-op
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.ratingsCol}>
        <View style={styles.ratingBlock}>
          <Text style={styles.label}>Critic's Rating:</Text>
          {showCritic ? (
            <View style={styles.valueRow}>
              <Text style={styles.percent}>{Math.round(movie.criticRating)}%</Text>
              <StarRow percent={movie.criticRating} size={14} />
              <Text style={styles.count}>
                ({movie.criticRatingCount} {movie.criticRatingCount === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          ) : (
            <Text style={styles.muted}>0 reviews</Text>
          )}
        </View>

        <View style={styles.ratingBlock}>
          <Text style={styles.label}>Avg. Users' Rating:</Text>
          {showUser ? (
            <View style={styles.valueRow}>
              <Text style={styles.percent}>{Math.round(movie.audienceRating)}%</Text>
              <StarRow percent={movie.audienceRating} size={14} />
              <Text style={styles.count}>
                ({movie.audienceRatingCount} {movie.audienceRatingCount === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          ) : (
            <Text style={styles.muted}>0 reviews</Text>
          )}
        </View>
      </View>

      {hasOwnReview ? (
        <View style={styles.ownReviewNote}>
          <Text style={styles.ownReviewNoteText}>
            ✓ You've reviewed this — edit or delete it from your review card below.
          </Text>
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        {hasOwnReview ? null : (
          <>
            <Pressable
              onPress={handleWriteReview}
              style={[styles.actionBtn, styles.actionPrimary]}
              accessibilityRole="button"
              accessibilityLabel="Rate movie"
            >
              <Text style={styles.actionPrimaryText}>★ Rate</Text>
            </Pressable>
            <Pressable
              onPress={handleWriteReview}
              style={[styles.actionBtn, styles.actionSuccess]}
              accessibilityRole="button"
              accessibilityLabel="Write a review"
            >
              <Text style={styles.actionSuccessText}>Write a Review</Text>
            </Pressable>
          </>
        )}
        <Pressable
          onPress={handleShare}
          style={[styles.actionBtn, styles.actionGhost]}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Text style={styles.actionGhostText}>↗ Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

const MovieRatingCard = React.memo(MovieRatingCardImpl);
export default MovieRatingCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 14,
      marginTop: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    ratingsCol: { gap: 12 },
    ratingBlock: { gap: 5 },
    label: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    percent: { fontSize: 16, fontWeight: '800', color: c.text },
    count: { fontSize: 12, fontWeight: '600', color: c.textTertiary },
    muted: { fontSize: 12.5, fontStyle: 'italic', color: c.textTertiary },

    ownReviewNote: {
      marginTop: 14,
      padding: 10,
      borderRadius: 8,
      backgroundColor: c.primarySoft,
    },
    ownReviewNoteText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      textAlign: 'center',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionPrimary: { backgroundColor: c.text },
    actionPrimaryText: { color: c.card, fontSize: 12.5, fontWeight: '800' },
    actionSuccess: { backgroundColor: '#22C55E' },
    actionSuccessText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
    actionGhost: {
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    actionGhostText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '800' },
  });
}
