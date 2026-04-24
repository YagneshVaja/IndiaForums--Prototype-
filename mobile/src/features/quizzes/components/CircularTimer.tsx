import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  secondsLeft: number;
  duration: number;
  size?: number;
}

export default function CircularTimer({ secondsLeft, duration, size = 44 }: Props) {
  const stroke = 3;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = duration > 0 ? secondsLeft / duration : 0;
  const dashOffset = circumference * (1 - progress);

  const color =
    secondsLeft <= 5 ? '#ef4444' :
    secondsLeft <= 10 ? '#f97316' : '#fbbf24';
  const textColor = secondsLeft <= 5 ? '#ef4444' : '#FFFFFF';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={[styles.label, { color: textColor }]}>{secondsLeft}s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
  },
});
