import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import Shimmer from './Shimmer';

export default function TopResultCardSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Shimmer style={styles.kicker} />
      <View style={styles.card}>
        <Shimmer style={styles.thumb} />
        <View style={styles.body}>
          <Shimmer style={styles.metaPill} />
          <Shimmer style={styles.phrase} />
          <Shimmer style={styles.phraseShort} />
        </View>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6, gap: 8 },
    kicker: { width: 78, height: 12, borderRadius: 4 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    thumb: { width: 64, height: 64, borderRadius: 10 },
    body: { flex: 1, gap: 6 },
    metaPill: { width: 60, height: 10, borderRadius: 4 },
    phrase: { width: '85%', height: 16, borderRadius: 4 },
    phraseShort: { width: '55%', height: 16, borderRadius: 4 },
  });
}
