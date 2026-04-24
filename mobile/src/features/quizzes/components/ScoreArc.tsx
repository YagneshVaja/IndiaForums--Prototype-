import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface Props {
  pct: number;
  size?: number;
  stroke?: number;
}

export default function ScoreArc({ pct, size = 80, stroke = 7 }: Props) {
  const radius = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const full = 2 * Math.PI * radius;
  // 270° sweep (3/4 of full circle) — matches web ResultArc
  const arcLen = full * 0.75;
  const fillLen = (Math.max(0, Math.min(100, pct)) / 100) * arcLen;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="scoreArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#F97316" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
          strokeDasharray={`${arcLen} ${full}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#scoreArc)"
          strokeWidth={stroke}
          strokeDasharray={`${fillLen} ${full}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
      </Svg>
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={[styles.label, { fontSize: size * 0.22 }]}>{pct}%</Text>
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
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});
