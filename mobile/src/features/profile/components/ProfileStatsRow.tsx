import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { fmtNum, fmtJoinMonthYear, timeAgo } from '../utils/format';
import { hapticTap } from '../../../utils/haptics';
import type { NormalizedProfile } from '../hooks/useProfile';

export type StatTileKey = 'posts' | 'comments' | 'buddies';

interface Props {
  profile: NormalizedProfile;
  buddiesCount?: number | null;
  // When provided, Posts/Comments/Buddies tiles become tappable and fire this
  // with the tile key. The parent should switch its active tab — but NOT
  // scroll the page; the user prefers to scroll down on their own.
  onTilePress?: (key: StatTileKey) => void;
}

interface StatItem {
  value: string;
  label: string;
  tileKey?: StatTileKey;
}

export default function ProfileStatsRow({ profile, buddiesCount, onTilePress }: Props) {
  const styles = useThemedStyles(makeStyles);

  const stats = useMemo<StatItem[]>(() => {
    const out: StatItem[] = [];

    out.push({ value: fmtNum(profile.postCount ?? 0), label: 'Posts', tileKey: 'posts' });
    out.push({
      value: fmtNum(profile.commentCount ?? 0),
      label: 'Comments',
      tileKey: 'comments',
    });
    out.push({ value: fmtNum(buddiesCount ?? 0), label: 'Buddies', tileKey: 'buddies' });

    const streakRaw = (profile.raw as { visitStreakCount?: number | string }).visitStreakCount;
    const streak = (() => {
      if (streakRaw == null) return 0;
      const n = typeof streakRaw === 'string' ? parseInt(streakRaw, 10) : streakRaw;
      return Number.isFinite(n) ? Number(n) : 0;
    })();
    if (streak > 0) out.push({ value: fmtNum(streak), label: 'Streak' });

    const joined = fmtJoinMonthYear(profile.joinDate);
    if (joined) out.push({ value: joined, label: 'Joined' });

    const visited = timeAgo(profile.lastVisitedDate);
    if (visited) out.push({ value: visited, label: 'Visited' });
    return out;
  }, [
    profile.postCount,
    profile.commentCount,
    profile.joinDate,
    profile.lastVisitedDate,
    profile.raw,
    buddiesCount,
  ]);

  return (
    <View style={styles.card}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.divider} />}
            <StatTile item={s} styles={styles} onTilePress={onTilePress} />
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

interface TileProps {
  item: StatItem;
  styles: ReturnType<typeof makeStyles>;
  onTilePress?: (key: StatTileKey) => void;
}

// Posts/Comments/Buddies render as Pressable so tapping switches the tab
// below. Streak/Joined/Visited stay as plain Views — no destination, no
// affordance. Importantly, the parent does NOT auto-scroll on tap; the user
// found the slide-to-top jarring and prefers to scroll down themselves.
function StatTile({ item, styles, onTilePress }: TileProps) {
  const tappable = item.tileKey != null && onTilePress != null;

  if (!tappable) {
    return (
      <View style={styles.stat}>
        <Text style={styles.value} numberOfLines={1}>
          {item.value}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {item.label}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        hapticTap();
        onTilePress!(item.tileKey!);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Show ${item.value} ${item.label.toLowerCase()}`}
      // pressRetentionOffset keeps the tap alive even with minor finger drift
      // inside the parent horizontal ScrollView.
      hitSlop={6}
      pressRetentionOffset={{ top: 16, bottom: 16, left: 16, right: 16 }}
      style={({ pressed }) => [styles.stat, pressed && styles.statPressed]}
    >
      <Text style={styles.value} numberOfLines={1}>
        {item.value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    row: {
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    stat: {
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      minWidth: 56,
    },
    statPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.96 }],
      backgroundColor: c.surface,
    },
    value: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    label: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontWeight: '600',
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      height: 24,
      backgroundColor: c.border,
    },
  });
}
