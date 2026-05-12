import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export default function BioSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.stats} />
      <View style={styles.about} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.section} />
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap:    { padding: 14, gap: 10 },
    stats:   { height: 70, borderRadius: 12, backgroundColor: c.surface },
    about:   { height: 60, borderRadius: 12, backgroundColor: c.surface },
    section: { height: 120, borderRadius: 12, backgroundColor: c.surface },
  });
}
