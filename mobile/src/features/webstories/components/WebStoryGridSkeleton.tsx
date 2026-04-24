import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  count?: number;
}

function SkeletonCell({ styles, opacity }: { styles: ReturnType<typeof makeStyles>; opacity: Animated.Value }) {
  return (
    <View style={styles.cell}>
      <Animated.View style={[styles.cover, { opacity }]} />
      <View style={styles.body}>
        <Animated.View style={[styles.lineLg, { opacity }]} />
        <Animated.View style={[styles.lineSm, { opacity }]} />
      </View>
    </View>
  );
}

export default function WebStoryGridSkeleton({ count = 6 }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  // Pair cells into rows of 2 to mirror the live grid layout.
  const rows: number[][] = [];
  for (let i = 0; i < count; i += 2) rows.push([i, i + 1].filter((n) => n < count));

  return (
    <View style={styles.wrap}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((i) => (
            <SkeletonCell key={i} styles={styles} opacity={opacity} />
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  const placeholder = c.border;
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 12,
      paddingTop: 4,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    cell: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    cover: {
      width: '100%',
      aspectRatio: 9 / 16,
      backgroundColor: placeholder,
    },
    body: {
      padding: 10,
      gap: 6,
    },
    lineLg: {
      height: 11,
      borderRadius: 4,
      backgroundColor: placeholder,
      width: '90%',
    },
    lineSm: {
      height: 9,
      borderRadius: 4,
      backgroundColor: placeholder,
      width: '50%',
    },
  });
}
