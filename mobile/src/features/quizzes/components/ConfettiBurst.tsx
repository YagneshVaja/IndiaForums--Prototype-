import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';

const EMOJIS = ['🎉', '✨', '⭐', '🎊', '🥳', '🏆'];

interface Props {
  count?: number;
  durationMs?: number;
}

/**
 * Lightweight confetti — N emoji sprites that fall from above the hero with
 * random horizontal drift + rotation. Runs once on mount, then stays idle.
 * Rendered as absolute-fill overlay; tapping passes through (pointerEvents).
 */
export default function ConfettiBurst({ count = 24, durationMs = 2800 }: Props) {
  const { width } = Dimensions.get('window');

  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        key:      `c-${i}`,
        emoji:    EMOJIS[i % EMOJIS.length],
        startX:   Math.random() * width,
        drift:    (Math.random() - 0.5) * 140,
        delay:    Math.floor(Math.random() * 600),
        duration: 1600 + Math.floor(Math.random() * 900),
        rot:      (Math.random() * 2 - 1) * 540,
        size:     18 + Math.floor(Math.random() * 12),
      })),
    [count, width],
  );

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.host]}
    >
      {pieces.map((p) => (
        <Piece
          key={p.key}
          emoji={p.emoji}
          startX={p.startX}
          drift={p.drift}
          delay={p.delay}
          duration={p.duration}
          rot={p.rot}
          size={p.size}
          fallHeight={360}
          totalMs={durationMs}
        />
      ))}
    </View>
  );
}

interface PieceProps {
  emoji: string;
  startX: number;
  drift: number;
  delay: number;
  duration: number;
  rot: number;
  size: number;
  fallHeight: number;
  totalMs: number;
}

function Piece({ emoji, startX, drift, delay, duration, rot, size, fallHeight }: PieceProps) {
  const translateY = useSharedValue(-40);
  const translateX = useSharedValue(0);
  const rotation   = useSharedValue(0);
  const opacity    = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(fallHeight, { duration, easing: Easing.in(Easing.quad) }),
    );
    translateX.value = withDelay(
      delay,
      withTiming(drift, { duration, easing: Easing.inOut(Easing.quad) }),
    );
    rotation.value = withDelay(
      delay,
      withTiming(rot, { duration, easing: Easing.linear }),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: duration - 500 }),
        withTiming(0, { duration: 380 }),
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: 0,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    overflow: 'hidden',
  },
});
