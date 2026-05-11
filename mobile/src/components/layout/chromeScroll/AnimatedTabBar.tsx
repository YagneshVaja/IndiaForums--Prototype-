import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { useChromeScroll } from './ChromeScrollContext';

/**
 * Custom `tabBar` prop for `Tab.Navigator`. Wraps the default `BottomTabBar` in
 * an Animated.View that translates down and fades out as `chromeProgress`
 * goes 0 → 1. Translation distance equals the measured height (which includes
 * the bottom safe-area inset).
 */
export default function AnimatedTabBar(props: BottomTabBarProps) {
  const { chromeProgress } = useChromeScroll();
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const [height, setHeight] = useState(56 + insets.bottom); // sane initial guess

  const animStyle = useAnimatedStyle(() => {
    const ty = interpolate(
      chromeProgress.value,
      [0, 1],
      [0, height],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      chromeProgress.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: ty }],
      opacity,
    };
  }, [height]);

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h !== height) setHeight(h);
  };

  return (
    <Animated.View
      onLayout={onLayout}
      // Solid background prevents content ghosting mid-translate.
      style={[styles.wrap, { backgroundColor: colors.card }, animStyle]}
    >
      <View style={styles.barInner}>
        <BottomTabBar {...props} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barInner: {},
});
