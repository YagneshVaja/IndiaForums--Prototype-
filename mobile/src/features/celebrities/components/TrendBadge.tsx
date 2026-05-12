import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CELEB_TREND_UP, CELEB_TREND_DOWN, CELEB_TREND_FLAT } from '../utils/constants';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  trend: 'up' | 'down' | 'stable';
  rankDiff: number;
  compact?: boolean;
}

export default function TrendBadge({ trend, rankDiff, compact = false }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  if (trend === 'stable' || rankDiff === 0) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.surface }]}>
        <Text style={[styles.arrow, { color: CELEB_TREND_FLAT }]}>—</Text>
        {!compact && <Text style={[styles.diff, { color: CELEB_TREND_FLAT }]}>No change</Text>}
      </View>
    );
  }
  const isUp = trend === 'up';
  const color = isUp ? CELEB_TREND_UP : CELEB_TREND_DOWN;
  const bg    = isUp ? '#ECFDF5' : '#FEF2F2';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.arrow, { color }]}>{isUp ? '▲' : '▼'}</Text>
      <Text style={[styles.diff, { color }]}>{rankDiff}</Text>
    </View>
  );
}

function makeStyles(_c: ThemeColors) {
  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    arrow: { fontSize: 10, fontWeight: '700' },
    diff:  { fontSize: 12, fontWeight: '700' },
  });
}
