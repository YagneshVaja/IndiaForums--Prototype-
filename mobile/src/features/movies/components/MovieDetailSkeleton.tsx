import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export default function MovieDetailSkeleton() {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.poster} />
        <View style={styles.heroMeta}>
          <View style={[styles.line, { width: '80%', height: 22 }]} />
          <View style={[styles.line, { width: '40%', height: 12, marginTop: 8 }]} />
          <View style={styles.pillRow}>
            <View style={styles.pill} />
            <View style={styles.pill} />
            <View style={styles.pill} />
          </View>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        <View style={[styles.line, { width: '50%', height: 12 }]} />
        <View style={[styles.line, { width: '30%', height: 12, marginTop: 8 }]} />
        <View style={[styles.line, { width: '100%', height: 10, marginTop: 14 }]} />
        <View style={[styles.line, { width: '90%', height: 10, marginTop: 6 }]} />
        <View style={[styles.line, { width: '70%', height: 10, marginTop: 6 }]} />
      </View>

      {/* Rating card */}
      <View style={styles.card}>
        <View style={[styles.line, { width: '40%', height: 14 }]} />
        <View style={[styles.line, { width: '60%', height: 12, marginTop: 6 }]} />
        <View style={[styles.line, { width: '40%', height: 14, marginTop: 14 }]} />
        <View style={[styles.line, { width: '60%', height: 12, marginTop: 6 }]} />
        <View style={styles.btnRow}>
          <View style={styles.btn} />
          <View style={styles.btn} />
          <View style={styles.btn} />
        </View>
      </View>

      {/* Cast row */}
      <View style={styles.castRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.castItem}>
            <View style={styles.avatar} />
            <View style={[styles.line, { width: '85%', height: 10, marginTop: 6 }]} />
            <View style={[styles.line, { width: '60%', height: 9, marginTop: 4 }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingBottom: 24 },
    hero: {
      flexDirection: 'row',
      gap: 14,
      paddingHorizontal: 14,
      paddingVertical: 18,
      backgroundColor: c.cardElevated,
    },
    poster: {
      width: 120,
      height: 180,
      borderRadius: 10,
      backgroundColor: c.card,
    },
    heroMeta: { flex: 1, paddingTop: 6 },
    pillRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pill: {
      width: 60,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.card,
    },

    card: {
      marginHorizontal: 14,
      marginTop: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    line: {
      backgroundColor: c.cardElevated,
      borderRadius: 4,
    },
    btnRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    btn: { flex: 1, height: 36, borderRadius: 18, backgroundColor: c.cardElevated },

    castRow: {
      flexDirection: 'row',
      gap: 14,
      paddingHorizontal: 14,
      paddingTop: 22,
    },
    castItem: { width: 78, alignItems: 'center' },
    avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: c.cardElevated },
  });
}
