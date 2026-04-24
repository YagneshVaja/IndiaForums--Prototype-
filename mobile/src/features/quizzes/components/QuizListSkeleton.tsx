import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  count?: number;
}

export default function QuizListSkeleton({ count = 5 }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.thumb} />
          <View style={styles.info}>
            <View style={[styles.line, { width: 80, height: 12 }]} />
            <View style={[styles.line, { width: '100%', height: 14, marginTop: 6 }]} />
            <View style={[styles.line, { width: '70%', height: 14, marginTop: 4 }]} />
            <View style={[styles.line, { width: 100, height: 11, marginTop: 10 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      marginHorizontal: 12,
      marginVertical: 5,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    thumb: {
      width: 92,
      height: 92,
      borderRadius: 12,
      backgroundColor: c.surface,
    },
    info: {
      flex: 1,
      minHeight: 92,
      justifyContent: 'center',
    },
    line: {
      backgroundColor: c.surface,
      borderRadius: 4,
    },
  });
}
