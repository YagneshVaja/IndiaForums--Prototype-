import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  rows?: number;
}

export default function MoviesGridSkeleton({ rows = 4 }: Props) {
  const styles = useThemedStyles(makeStyles);
  const rowsArr = Array.from({ length: rows });
  return (
    <View style={styles.wrap}>
      {rowsArr.map((_, r) => (
        <View key={r} style={styles.row}>
          <View style={styles.cell}>
            <View style={styles.poster} />
            <View style={styles.lineLg} />
            <View style={styles.lineSm} />
          </View>
          <View style={styles.cell}>
            <View style={styles.poster} />
            <View style={styles.lineLg} />
            <View style={styles.lineSm} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 12, paddingTop: 12 },
    row:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
    cell: { flex: 1 },
    poster: {
      width: '100%',
      aspectRatio: 2 / 3,
      borderRadius: 10,
      backgroundColor: c.cardElevated,
    },
    lineLg: {
      marginTop: 8,
      height: 12,
      width: '85%',
      borderRadius: 4,
      backgroundColor: c.cardElevated,
    },
    lineSm: {
      marginTop: 6,
      height: 9,
      width: '50%',
      borderRadius: 4,
      backgroundColor: c.cardElevated,
    },
  });
}
