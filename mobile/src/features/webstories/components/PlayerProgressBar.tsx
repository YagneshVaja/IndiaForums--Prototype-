import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface Props {
  total: number;
  currentIdx: number;
  /** Animated value 0..1 for the current segment fill */
  progress: Animated.Value;
}

export default function PlayerProgressBar({
  total,
  currentIdx,
  progress,
}: Props) {
  const segCount = Math.max(1, total);
  const segments: number[] = [];
  for (let i = 0; i < segCount; i++) segments.push(i);

  return (
    <View style={styles.row} pointerEvents="none">
      {segments.map((i) => {
        let fill: '0%' | '100%' | Animated.AnimatedInterpolation<string> =
          '0%';
        if (i < currentIdx) fill = '100%';
        else if (i === currentIdx) {
          fill = progress.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp',
          });
        }
        return (
          <View key={i} style={styles.seg}>
            <Animated.View style={[styles.fill, { width: fill }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  seg: {
    flex: 1,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
