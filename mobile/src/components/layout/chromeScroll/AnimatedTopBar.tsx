import React, { useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopNavBrand } from '../TopNavBar';
import { useChromeScroll } from './ChromeScrollContext';

type TopNavBrandProps = React.ComponentProps<typeof TopNavBrand>;

interface Props extends TopNavBrandProps {
  /** Receives the measured chrome height so the screen can pad its content. */
  onMeasure?: (height: number) => void;
  /**
   * Optional secondary chrome rendered below `TopNavBrand` in the same animated
   * container — e.g. a screen-level tab strip. Animates and measures together
   * with the bar so the consumer only needs one `topInset` value.
   */
  children?: React.ReactNode;
}

/**
 * Wraps `TopNavBrand` in an Animated.View that translates up and fades out
 * as `chromeProgress` goes 0 → 1. Height is measured via `onLayout` so the
 * translation includes the status-bar safe-area inset and the bar fully
 * disappears on devices with a notch or tall status bar.
 */
export default function AnimatedTopBar({ onMeasure, children, ...brandProps }: Props) {
  const { chromeProgress } = useChromeScroll();
  const [height, setHeight] = useState(0);
  const safeTop = useSafeAreaInsets().top;

  // Translate by (height - safeTop) — *not* the full height — so the brand
  // row's bottom edge lands at y = safeTop when fully collapsed, matching
  // where the sticky category dock parks (its paddingTop animates to
  // safeTop). Without this the brand row outraced the dock and a strip of
  // feed content showed through between them mid-slide.
  const collapseDistance = Math.max(0, height - safeTop);

  const animStyle = useAnimatedStyle(() => {
    const ty = interpolate(
      chromeProgress.value,
      [0, 1],
      [0, -collapseDistance],
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
  }, [collapseDistance]);

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
      {children}
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
