import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  count?: number;
}

export default function QuizListSkeleton({ count = 6 }: Props) {
  const styles = useThemedStyles(makeStyles);

  // Render featured + a 2-col grid of placeholders.
  const gridCount = Math.max(0, count - 1);
  const rows: number[][] = [];
  for (let i = 0; i < gridCount; i += 2) {
    rows.push([i, i + 1].filter((n) => n < gridCount));
  }

  return (
    <View>
      <View style={styles.featured} />

      {rows.map((row, idx) => (
        <View key={idx} style={styles.gridRow}>
          {row.map((n) => (
            <View key={n} style={styles.card}>
              <View style={styles.thumb} />
              <View style={styles.info}>
                <View style={[styles.line, { width: 60, height: 9 }]} />
                <View style={[styles.line, { width: '95%', height: 12, marginTop: 6 }]} />
                <View style={[styles.line, { width: '70%', height: 12, marginTop: 4 }]} />
              </View>
            </View>
          ))}
          {row.length === 1 ? <View style={styles.card} /> : null}
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    featured: {
      marginHorizontal: 12,
      marginTop: 14,
      marginBottom: 6,
      aspectRatio: 16 / 10,
      borderRadius: 18,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    gridRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 12,
      marginTop: 10,
    },
    card: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    thumb: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: c.surface,
    },
    info: {
      padding: 10,
      minHeight: 90,
    },
    line: {
      backgroundColor: c.surface,
      borderRadius: 4,
    },
  });
}
