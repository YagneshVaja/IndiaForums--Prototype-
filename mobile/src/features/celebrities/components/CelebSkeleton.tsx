import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export default function CelebSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.pills}>
        <View style={styles.pill} />
        <View style={styles.pill} />
        <View style={styles.pill} />
      </View>
      <View style={styles.hero} />
      <View style={styles.runnerRow}>
        <View style={styles.runner} />
        <View style={styles.runner} />
      </View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.rankRow} />
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { padding: 14, gap: 12, backgroundColor: c.bg, flex: 1 },
    pills: { flexDirection: 'row', gap: 8 },
    pill:  { flex: 1, height: 36, borderRadius: 999, backgroundColor: c.surface },
    hero:  { height: 340, borderRadius: 18, backgroundColor: c.surface },
    runnerRow: { flexDirection: 'row', gap: 10 },
    runner: { flex: 1, height: 210, borderRadius: 14, backgroundColor: c.surface },
    rankRow: { height: 64, borderRadius: 8, backgroundColor: c.surface },
  });
}
