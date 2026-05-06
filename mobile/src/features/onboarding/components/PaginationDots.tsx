import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';

interface Props {
  count: number;
  activeIndex: number;
  /** Color of the active dot. Falls back to theme primary. */
  activeColor?: string;
}

function Dot({ isActive, activeColor }: { isActive: boolean; activeColor: string }) {
  const colors = useThemeStore((s) => s.colors);
  const width = useRef(new Animated.Value(isActive ? 28 : 8)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0.45)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(width, {
        toValue: isActive ? 28 : 8,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: isActive ? 1 : 0.45,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive, width, opacity]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          opacity,
          backgroundColor: isActive ? activeColor : colors.border,
        },
      ]}
    />
  );
}

export function PaginationDots({ count, activeIndex, activeColor }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const resolvedActive = activeColor ?? colors.primary;
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} isActive={i === activeIndex} activeColor={resolvedActive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
