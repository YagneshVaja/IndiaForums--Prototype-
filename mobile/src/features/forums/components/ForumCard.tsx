import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Forum } from '../../../services/api';
import { formatCount } from '../utils/format';
import { useForumFollowStore } from '../store/forumFollowStore';
import { useForumStats } from '../hooks/useForumStats';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

interface Props {
  forum: Forum;
  onPress: (forum: Forum) => void;
}

function ForumCardImpl({ forum, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const { data: stats, isLoading: statsLoading } = useForumStats(forum.id);
  const followOverride = useForumFollowStore((s) => s.byForumId[forum.id]);

  const followCount = followOverride?.countOverride
    ?? stats?.followCount
    ?? forum.followCount;
  const rank = stats?.rank ?? forum.rank;
  const prevRank = stats?.prevRank ?? forum.prevRank;

  const hasRank = rank > 0;
  const hasFollowers = followCount > 0;
  const rankMove = useMemo(() => {
    if (!hasRank || !prevRank) return '';
    const diff = prevRank - rank;
    if (diff > 0) return '+' + diff;
    if (diff < 0) return String(diff);
    return '';
  }, [rank, prevRank, hasRank]);

  // Skeletons render in the same slots as real data so the layout never shifts.
  const showRankSkeleton = statsLoading && !hasRank;
  const showFollowSkeleton = statsLoading && !hasFollowers;

  const a11yLabel = useMemo(() => {
    const parts: string[] = [forum.name];
    if (forum.hot) parts.push('trending');
    if (hasRank) parts.push(`ranked number ${rank}`);
    if (forum.topicCount > 0) parts.push(`${formatCount(forum.topicCount)} topics`);
    if (hasFollowers) parts.push(`${formatCount(followCount)} followers`);
    return parts.join(', ');
  }, [forum.name, forum.hot, forum.topicCount, hasRank, rank, hasFollowers, followCount]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(forum)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={[styles.avatar, { backgroundColor: forum.bg }]}>
        {forum.thumbnailUrl ? (
          <Image
            source={{ uri: forum.thumbnailUrl }}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <Text style={styles.avatarEmoji}>{forum.emoji}</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>{forum.name}</Text>
          {forum.hot && (
            <Ionicons
              name="flame"
              size={14}
              color={colors.accent}
              style={styles.hotIcon}
            />
          )}
        </View>

        <View style={styles.statsRow}>
          {hasRank && (
            <View
              style={styles.rankPill}
              accessible
              accessibilityLabel={`ranked number ${rank}${rankMove ? `, ${rankMove.startsWith('+') ? 'up' : 'down'} ${rankMove.replace(/^[+-]/, '')}` : ''}`}
            >
              <Ionicons name="trophy" size={11} color={colors.accent} />
              <Text style={styles.rankText}>#{rank}</Text>
              {!!rankMove && (
                <Text
                  style={[
                    styles.rankMove,
                    rankMove.startsWith('+') ? styles.rankMoveUp : styles.rankMoveDown,
                  ]}
                >
                  {rankMove.startsWith('+') ? '▲' : '▼'}
                  {rankMove.replace(/^[+-]/, '')}
                </Text>
              )}
            </View>
          )}
          {showRankSkeleton && <View style={styles.skeletonPill} />}

          {forum.topicCount > 0 && (
            <Stat
              icon="chatbubble-ellipses-outline"
              value={formatCount(forum.topicCount)}
              a11yLabel={`${formatCount(forum.topicCount)} topics`}
              styles={styles}
              colors={colors}
            />
          )}

          {hasFollowers && (
            <Stat
              icon="people-outline"
              value={formatCount(followCount)}
              a11yLabel={`${formatCount(followCount)} followers`}
              styles={styles}
              colors={colors}
            />
          )}
          {showFollowSkeleton && <View style={styles.skeletonStat} />}
        </View>
      </View>
    </Pressable>
  );
}

const ForumCard = React.memo(ForumCardImpl);
export default ForumCard;

function Stat({ icon, value, a11yLabel, styles, colors }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  a11yLabel: string;
  styles: Styles;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={a11yLabel}>
      <Ionicons name={icon} size={13} color={colors.textTertiary} />
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.card,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginHorizontal: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    cardPressed: {
      backgroundColor: c.surface,
      transform: [{ scale: 0.99 }],
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    avatarEmoji: {
      fontSize: 26,
    },
    body: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    name: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
      lineHeight: 20,
      letterSpacing: -0.1,
    },
    hotIcon: {
      marginTop: 3,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rankPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
    },
    rankText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.accent,
      letterSpacing: 0.2,
    },
    rankMove: {
      fontSize: 9,
      fontWeight: '700',
      marginLeft: 2,
    },
    rankMoveUp: {
      color: c.success,
    },
    rankMoveDown: {
      color: c.danger,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
    },
    skeletonPill: {
      width: 56,
      height: 22,
      borderRadius: 999,
      backgroundColor: c.surface,
      opacity: 0.7,
    },
    skeletonStat: {
      width: 44,
      height: 14,
      borderRadius: 4,
      backgroundColor: c.surface,
      opacity: 0.7,
    },
  });
}
