import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet,
  type StyleProp, type ViewStyle, type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';

interface Props {
  style?: StyleProp<ViewStyle>;
}

const STRIPE_WIDTH = 120;

/**
 * Loading placeholder with a moving gradient stripe — the production-app
 * pattern (LinkedIn, Facebook, YouTube). A translucent highlight sweeps
 * left-to-right across a base-colored block on a 1.2s loop. Falls back to
 * a static block until the first onLayout sets the container width.
 */
export default function Shimmer({ style }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(-STRIPE_WIDTH);

  useEffect(() => {
    if (width === 0) return;
    translateX.value = -STRIPE_WIDTH;
    translateX.value = withRepeat(
      withTiming(width + STRIPE_WIDTH, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [width, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) setWidth(w);
  }

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, { backgroundColor: colors.surface }, style]}
    >
      {width > 0 ? (
        <Animated.View style={[styles.stripe, animatedStyle]}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.45)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  stripe: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: STRIPE_WIDTH,
  },
});
