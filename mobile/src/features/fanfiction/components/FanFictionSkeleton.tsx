import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  count?: number;
}

export default function FanFictionSkeleton({ count = 5 }: Props) {
  const styles = useThemedStyles(makeStyles);
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
    <View style={styles.wrap}>
      <Animated.View style={[styles.hero, { opacity }]} />
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]}>
          <View style={styles.cover} />
          <View style={styles.body}>
            <View style={[styles.line, styles.lineShort]} />
            <View style={styles.line} />
            <View style={[styles.line, styles.lineMed]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingTop: 12 },
    hero: {
      height: 220,
      borderRadius: 14,
      backgroundColor: c.surface,
      marginHorizontal: 12,
      marginBottom: 14,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      marginHorizontal: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      height: 108,
    },
    cover: {
      width: 92,
      backgroundColor: c.surface,
    },
    body: { flex: 1, padding: 10, gap: 8 },
    line: { height: 10, borderRadius: 4, backgroundColor: c.surface },
    lineShort: { width: '35%' },
    lineMed: { width: '70%' },
  });
}
