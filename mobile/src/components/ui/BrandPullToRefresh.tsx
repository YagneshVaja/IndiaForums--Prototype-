import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useThemeStore } from '../../store/themeStore';

const LOGO_ICON = require('../../../assets/icon.png');

const INDICATOR_SIZE = 40;
const HELD_OFFSET = 24;
const SPRING = { damping: 16, stiffness: 220, mass: 0.6 } as const;

interface Props {
  /** Mirrors the host RefreshControl's `refreshing` flag. */
  refreshing: boolean;
  /** Measured height of the absolute-positioned chrome above the list. */
  topInset: number;
}

// Brand-gem refresh indicator. Designed to sit as a sibling above a FlashList
// whose host uses a (visually-hidden) native RefreshControl for the actual
// pull gesture. Same pattern Twitter / Instagram / Hotstar use: keep the OS
// gesture, paint the brand on top.
export default function BrandRefreshIndicator({ refreshing, topInset }: Props) {
  const colors = useThemeStore((s) => s.colors);

  const visible = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      visible.value = withSpring(1, SPRING);
      spin.value = 0;
      spin.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      visible.value = withTiming(0, { duration: 220 });
      cancelAnimation(spin);
      spin.value = withTiming(0, { duration: 200 });
    }
    // Shared values are stable; including them is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  const animStyle = useAnimatedStyle(() => ({
    top: topInset + HELD_OFFSET,
    opacity: visible.value,
    transform: [
      { scale: 0.6 + visible.value * 0.4 },
      { rotate: `${spin.value * 360}deg` },
    ],
  }), [topInset]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.indicator,
        {
          backgroundColor: colors.card,
          shadowColor: colors.text,
          borderColor: colors.primary,
        },
        animStyle,
      ]}
    >
      <Image source={LOGO_ICON} style={styles.gem} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 5,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  gem: {
    width: 22,
    height: 22,
  },
});
