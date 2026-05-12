import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { TopicTopPoster } from '../../../services/api';

interface Props {
  posters: TopicTopPoster[];
  maxVisible?: number;
  onPress?: () => void;
}

const SIZE = 24;
const OVERLAP = 8;

/**
 * Inline cluster of overlapping avatars with a "+N" pill — the pattern used
 * by Slack, Apple Mail, Instagram "liked by", and most modern apps to show
 * "X people did this" without spending a full row on a horizontal scroll.
 */
export default function AvatarCluster({ posters, maxVisible = 5, onPress }: Props) {
  const styles = useThemedStyles(makeStyles);

  if (posters.length === 0) return null;

  const visible = posters.slice(0, maxVisible);
  const remaining = posters.length - visible.length;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${posters.length} contributors. Tap to view all.`}
    >
      <View style={styles.row}>
        {visible.map((p, i) => (
          <View
            key={p.userId}
            style={[styles.slot, i > 0 && { marginLeft: -OVERLAP }]}
          >
            {p.avatarUrl ? (
              <Image
                source={{ uri: p.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>
                  {(p.userName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ))}
        {remaining > 0 && (
          <View style={[styles.slot, styles.moreSlot, { marginLeft: -OVERLAP }]}>
            <Text style={styles.moreText}>+{remaining}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    wrapPressed: {
      opacity: 0.75,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    slot: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      backgroundColor: c.card,
      // The white-border-on-card trick is what creates the visual stack —
      // each avatar gets a 2px ring of card color so adjacent overlapping
      // circles don't blend into a blob.
      borderWidth: 2,
      borderColor: c.card,
      overflow: 'hidden',
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: SIZE / 2,
      backgroundColor: c.surface,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    avatarLetter: {
      fontSize: 10,
      fontWeight: '800',
      color: c.onPrimary,
    },
    moreSlot: {
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreText: {
      fontSize: 9,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.2,
    },
  });
}
