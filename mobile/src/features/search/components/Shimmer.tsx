import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { useThemeStore } from '../../../store/themeStore';

interface Props {
  style?: StyleProp<ViewStyle>;
}

/**
 * A surface-colored block that pulses opacity to signal a loading
 * placeholder. Used to compose skeleton rows. One shared timing curve
 * across the screen so adjacent shimmers stay in phase.
 */
export default function Shimmer({ style }: Props) {
  const surface = useThemeStore((s) => s.colors.surface);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ backgroundColor: surface }, style, animated]}
    />
  );
}
