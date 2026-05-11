import React, { useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { TopNavBrand } from '../TopNavBar';
import { useChromeScroll } from './ChromeScrollContext';

type TopNavBrandProps = React.ComponentProps<typeof TopNavBrand>;

interface Props extends TopNavBrandProps {
  /** Receives the measured chrome height so the screen can pad its content. */
  onMeasure?: (height: number) => void;
}

/**
 * Wraps `TopNavBrand` in an Animated.View that translates up and fades out
 * as `chromeProgress` goes 0 → 1. Height is measured via `onLayout` so the
 * translation includes the status-bar safe-area inset and the bar fully
 * disappears on devices with a notch or tall status bar.
 */
export default function AnimatedTopBar({ onMeasure, ...brandProps }: Props) {
  const { chromeProgress } = useChromeScroll();
  const [height, setHeight] = useState(0);

  const animStyle = useAnimatedStyle(() => {
    const ty = interpolate(
      chromeProgress.value,
      [0, 1],
      [0, -height],
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

  // pointerEvents is bound to the *visible* state to avoid swallowing
  // taps on content underneath while chrome is hidden.
  const pointerEventsStyle = useAnimatedStyle(() => ({
    pointerEvents: chromeProgress.value > 0.95 ? 'none' : 'auto',
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h !== height) {
      setHeight(h);
      onMeasure?.(h);
    }
  };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[styles.wrap, animStyle, pointerEventsStyle]}
    >
      <TopNavBrand {...brandProps} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
