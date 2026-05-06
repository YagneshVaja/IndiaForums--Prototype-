import React, { useEffect, useMemo, useRef } from 'react';
import {
  Image,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/themeStore';
import type { ThemeColors } from '../theme/tokens';

const SPLASH_LOGO = require('../../assets/splash-logo.png');

interface Props {
  /** Called once after holdMs has elapsed. The visual keeps animating. */
  onReady?: () => void;
  /** Minimum visible duration in ms. Default 2000. */
  holdMs?: number;
}

const SPARKS = [
  { color: '#3558F0', size: 14, top: '18%' as const, left: '14%' as const, delay: 0 },
  { color: '#EC4899', size: 10, top: '24%' as const, right: '20%' as const, delay: 200 },
  { color: '#F59E0B', size: 8,  top: '38%' as const, right: '12%' as const, delay: 400 },
  { color: '#10B981', size: 10, bottom: '32%' as const, left: '16%' as const, delay: 600 },
  { color: '#8B5CF6', size: 12, bottom: '24%' as const, right: '24%' as const, delay: 300 },
  { color: '#3558F0', size: 6,  top: '54%' as const, left: '10%' as const, delay: 500 },
] as const;

function FloatingSpark({
  color,
  size,
  delay,
  style,
}: {
  color: string;
  size: number;
  delay: number;
  style: object;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(400 + delay),
      Animated.timing(opacity, {
        toValue: 0.7,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -4,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    float.start();
    return () => float.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      style={[
        sharedStyles.spark,
        style,
        {
          width: size,
          height: size,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

function GlowRing({ size, baseOpacity, pulseDelay }: { size: number; baseOpacity: number; pulseDelay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150 + pulseDelay),
      Animated.timing(opacity, {
        toValue: baseOpacity,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 1600 + pulseDelay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.94,
          duration: 1600 + pulseDelay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [baseOpacity, pulseDelay, opacity, scale]);

  return (
    <Animated.View
      style={[
        sharedStyles.glowRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

const sharedStyles = StyleSheet.create({
  glowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(53,88,240,0.18)',
  },
  spark: {
    position: 'absolute',
    borderRadius: 999,
  },
});

export default function BrandSplash({ onReady, holdMs = 2000 }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(8)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 13,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.spring(logoY, {
        toValue: 0,
        damping: 13,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(700),
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(taglineY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      onReady?.();
    }, holdMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LinearGradient
      colors={['#FFFFFF', '#EEF2FF', '#C9D6FF']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {SPARKS.map((s, i) => {
        const { color, size, delay, ...positionStyle } = s;
        return (
          <FloatingSpark
            key={i}
            color={color}
            size={size}
            delay={delay}
            style={positionStyle}
          />
        );
      })}

      <GlowRing size={380} baseOpacity={0.10} pulseDelay={0} />
      <GlowRing size={300} baseOpacity={0.16} pulseDelay={150} />
      <GlowRing size={220} baseOpacity={0.22} pulseDelay={300} />

      <Animated.View
        style={[
          styles.logoArea,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { translateY: logoY }],
          },
        ]}
      >
        <Image source={SPLASH_LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.View
        style={[
          styles.taglineWrap,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineY }],
          },
        ]}
      >
        <Text style={styles.tagline}>Your fan community awaits</Text>
      </Animated.View>

      <Animated.View style={[styles.loader, { opacity: loaderOpacity }]}>
        <ActivityIndicator color="#3558F0" size="small" />
      </Animated.View>
    </LinearGradient>
  );
}

function makeStyles(_c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoArea: {
      alignItems: 'center',
    },
    logo: {
      width: 280,
      height: 204,
    },
    taglineWrap: {
      position: 'absolute',
      bottom: '28%',
      alignItems: 'center',
    },
    tagline: {
      fontSize: 14,
      fontWeight: '600',
      color: '#475569',
      letterSpacing: 0.4,
    },
    loader: {
      position: 'absolute',
      bottom: 64,
    },
  });
}
