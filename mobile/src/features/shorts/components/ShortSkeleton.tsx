import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';

import { useThemeStore } from '../../../store/themeStore';

interface Props {
  height: number;
  topOffset: number;
}

export default function ShortSkeleton({ height, topOffset }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors.card, colors.border), [colors]);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 420],
  });

  return (
    <View style={[styles.card, { height }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.shimmer, { transform: [{ translateX: translate }] }]}
      />

      {/* progress bar placeholder */}
      <View style={[styles.bar, { top: topOffset + 4 }]} />
      <View style={[styles.chip, { top: topOffset + 4 + 10 }]} />

      <View style={styles.bottom}>
        <View style={styles.title} />
        <View style={styles.titleShort} />
        <View style={styles.desc} />
        <View style={styles.btn} />
      </View>
    </View>
  );
}

function makeStyles(cardBg: string, borderColor: string) {
  return StyleSheet.create({
    card: {
      backgroundColor: cardBg,
      position: 'relative',
      overflow: 'hidden',
    },
    shimmer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 220,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    bar: {
      position: 'absolute',
      left: 14,
      right: 14,
      height: 2.5,
      backgroundColor: borderColor,
      borderRadius: 2,
    },
    chip: {
      position: 'absolute',
      left: 14,
      width: 64,
      height: 18,
      backgroundColor: borderColor,
      borderRadius: 99,
    },
    bottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 22,
      paddingHorizontal: 16,
    },
    title: {
      height: 16,
      backgroundColor: borderColor,
      borderRadius: 4,
      marginBottom: 8,
    },
    titleShort: {
      height: 16,
      width: '65%',
      backgroundColor: borderColor,
      borderRadius: 4,
      marginBottom: 10,
    },
    desc: {
      height: 11,
      backgroundColor: borderColor,
      borderRadius: 4,
      marginBottom: 16,
    },
    btn: {
      height: 40,
      backgroundColor: borderColor,
      borderRadius: 10,
    },
  });
}
