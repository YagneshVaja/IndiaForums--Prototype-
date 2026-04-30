import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import Shimmer from './Shimmer';

export default function SuggestionSkeleton() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Shimmer style={styles.thumb} />
      <View style={styles.body}>
        <Shimmer style={styles.linePrimary} />
        <Shimmer style={styles.lineSecondary} />
      </View>
    </View>
  );
}

function makeStyles(_c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    thumb: { width: 36, height: 36, borderRadius: 8 },
    body: { flex: 1, gap: 6 },
    linePrimary: { height: 12, width: '60%', borderRadius: 4 },
    lineSecondary: { height: 10, width: '35%', borderRadius: 4 },
  });
}
