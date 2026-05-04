import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { MovieReview } from '../../../services/api';

interface Props {
  review: MovieReview;
  /** When all three are present, the card shows inline edit + delete icon
   *  buttons. Used only on the current user's own review card. */
  onEdit?: () => void;
  onDelete?: () => void;
  isOwn?: boolean;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ReviewCardImpl({ review, onEdit, onDelete, isOwn }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const date = formatDate(review.postedAt);
  const showOwnerActions = isOwn && (onEdit || onDelete);

  return (
    <View style={[styles.card, isOwn && styles.cardOwn]}>
      <View style={styles.header}>
        {review.authorImageUrl ? (
          <Image
            source={{ uri: review.authorImageUrl }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{(review.authorName[0] ?? '?').toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.author} numberOfLines={1}>{review.authorName}</Text>
            {review.isCritic ? <Text style={styles.criticBadge}>CRITIC</Text> : null}
            {isOwn ? <Text style={styles.youBadge}>YOU</Text> : null}
          </View>
          {date ? <Text style={styles.date}>{date}</Text> : null}
        </View>
        {review.rating != null ? (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>{Math.round(review.rating)}%</Text>
          </View>
        ) : null}
      </View>

      {review.title ? <Text style={styles.title} numberOfLines={2}>{review.title}</Text> : null}
      <Text style={styles.body} numberOfLines={5}>{review.body}</Text>

      {review.fullReviewUrl ? (
        <Pressable
          onPress={() => Linking.openURL(review.fullReviewUrl as string)}
          style={({ pressed }) => [styles.readMore, pressed && styles.actionPressed]}
          accessibilityRole="link"
          accessibilityLabel="Read full review on IndiaForums"
        >
          <Text style={styles.readMoreText}>Read full review on IndiaForums →</Text>
        </Pressable>
      ) : null}

      {showOwnerActions ? (
        <View style={styles.actionsRow}>
          {onEdit ? (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [styles.actionBtn, styles.actionEdit, pressed && styles.actionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Edit your review"
              hitSlop={6}
            >
              <Ionicons name="create-outline" size={15} color={colors.primary} />
              <Text style={styles.actionEditText}>Edit</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.actionBtn, styles.actionDelete, pressed && styles.actionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Delete your review"
              hitSlop={6}
            >
              <Ionicons name="trash-outline" size={15} color="#DC2626" />
              <Text style={styles.actionDeleteText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const ReviewCard = React.memo(ReviewCardImpl);
export default ReviewCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    cardOwn: {
      borderColor: c.primary,
      borderWidth: 1.5,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.cardElevated },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: c.textSecondary, fontWeight: '800', fontSize: 14 },
    headerText: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    author: { fontSize: 13, fontWeight: '700', color: c.text, flexShrink: 1 },
    criticBadge: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: c.primary,
      backgroundColor: c.primarySoft,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    youBadge: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: '#FFFFFF',
      backgroundColor: c.primary,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    date: { fontSize: 11, color: c.textTertiary, marginTop: 1 },
    ratingPill: {
      backgroundColor: c.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    ratingText: { fontSize: 12, fontWeight: '800', color: c.primary },
    title: { marginTop: 10, fontSize: 14, fontWeight: '700', color: c.text },
    body: { marginTop: 6, fontSize: 13, lineHeight: 19, color: c.textSecondary },

    readMore: { marginTop: 10, alignSelf: 'flex-start' },
    readMoreText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: c.primary,
    },

    actionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
    },
    actionPressed: { opacity: 0.6 },
    actionEdit: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    actionEditText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
    },
    actionDelete: {
      borderColor: '#FCA5A5',
      backgroundColor: '#FEE2E2',
    },
    actionDeleteText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#DC2626',
    },
  });
}
