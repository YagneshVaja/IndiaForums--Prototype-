import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { fmtNum, fmtJoinMonthYear } from '../utils/format';
import type { NormalizedProfile } from '../hooks/useProfile';

interface Props {
  profile: NormalizedProfile;
  buddiesCount?: number | null;
}

export default function ProfileStatsRow({ profile, buddiesCount }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const stats = useMemo(() => {
    const out: { value: string; label: string }[] = [];

    // Always render the foundational counts so the row layout is stable across
    // users — even brand-new accounts with 0 posts and 0 comments. fmtNum(0) → "0".
    out.push({ value: fmtNum(profile.postCount ?? 0), label: 'Posts' });
    out.push({ value: fmtNum(profile.commentCount ?? 0), label: 'Comments' });
    out.push({ value: fmtNum(buddiesCount ?? 0), label: 'Buddies' });

    const streakRaw = (profile.raw as { visitStreakCount?: number | string }).visitStreakCount;
    const streak = (() => {
      if (streakRaw == null) return 0;
      const n = typeof streakRaw === 'string' ? parseInt(streakRaw, 10) : streakRaw;
      return Number.isFinite(n) ? Number(n) : 0;
    })();
    // Streak is a "you only see this if it's interesting" engagement metric.
    if (streak > 0) out.push({ value: fmtNum(streak), label: 'Streak' });

    const joined = fmtJoinMonthYear(profile.joinDate);
    if (joined) out.push({ value: joined, label: 'Joined' });
    return out;
  }, [profile.postCount, profile.commentCount, profile.joinDate, profile.raw, buddiesCount]);

  return (
    <View style={styles.card}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.stat}>
            <Text style={styles.value}>{s.value}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: c.card,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 8,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
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
