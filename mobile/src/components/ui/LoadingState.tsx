import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

function SkeletonBox({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) {
  const opacity = React.useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        { height, borderRadius, backgroundColor: '#E2E2E2' },
        typeof width === 'number' ? { width } : { width: width as unknown as number },
        { opacity },
      ]}
    />
  );
}

export default function LoadingState() {
  return (
    <View style={styles.container}>
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.card}>
          <SkeletonBox width="100%" height={180} />
          <View style={styles.meta}>
            <SkeletonBox width={200} height={14} />
            <SkeletonBox width={120} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  card:      { gap: 10 },
  meta:      { gap: 8 },
});
