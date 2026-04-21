import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  count?: number;
}

export default function GallerySkeleton({ count = 6 }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]}>
          <View style={styles.thumb} />
          <View style={styles.body}>
            <View style={styles.line} />
            <View style={[styles.line, styles.lineShort]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    card: {
      width: '48%',
      backgroundColor: c.card,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    thumb: {
      aspectRatio: 4 / 3,
      backgroundColor: c.surface,
    },
    body: { padding: 8, gap: 6 },
    line: { height: 10, borderRadius: 4, backgroundColor: c.surface },
    lineShort: { width: '55%' },
  });
}
