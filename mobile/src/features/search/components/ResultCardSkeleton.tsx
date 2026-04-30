import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import Shimmer from './Shimmer';

export default function ResultCardSkeleton() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <Shimmer style={styles.thumb} />
      <View style={styles.body}>
        <Shimmer style={styles.pill} />
        <Shimmer style={styles.lineTitle} />
        <Shimmer style={styles.lineSummary} />
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    thumb: { width: 92, height: 70, borderRadius: 8 },
    body: { flex: 1, gap: 6 },
    pill: { width: 60, height: 14, borderRadius: 6 },
    lineTitle: { width: '85%', height: 14, borderRadius: 4 },
    lineSummary: { width: '60%', height: 10, borderRadius: 4 },
  });
}
