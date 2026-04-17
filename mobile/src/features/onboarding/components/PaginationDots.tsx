import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface Props {
  count: number;
  activeIndex: number;
}

function Dot({ isActive }: { isActive: boolean }) {
  const width = useRef(new Animated.Value(isActive ? 24 : 8)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(width, {
        toValue: isActive ? 24 : 8,
        duration: 300,
        useNativeDriver: false, // width cannot use native driver
      }),
      Animated.timing(opacity, {
        toValue: isActive ? 1 : 0.3,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          opacity,
          backgroundColor: isActive ? '#3558F0' : '#C8CFEA',
        },
      ]}
    />
  );
}

export function PaginationDots({ count, activeIndex }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} isActive={i === activeIndex} />
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
