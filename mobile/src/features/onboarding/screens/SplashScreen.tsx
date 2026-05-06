import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

const SPLASH_LOGO = require('../../../../assets/splash-logo.png');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoY = useRef(new Animated.Value(16)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const sparkOpacity = useRef(new Animated.Value(0)).current;
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
        damping: 14,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.spring(logoY, {
        toValue: 0,
        damping: 14,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(sparkOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.08,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    const timer = setTimeout(() => {
      navigation.replace('OnboardingSlides');
    }, 2400);

    return () => {
      clearTimeout(timer);
      pulse.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F0F4FF', '#C9D6FF']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.spark,
          styles.sparkTopLeft,
          { opacity: sparkOpacity },
        ]}
      />
      <Animated.View
        style={[
          styles.spark,
          styles.sparkBottomRight,
          { opacity: sparkOpacity },
        ]}
      />
      <Animated.View
        style={[
          styles.spark,
          styles.sparkSide,
          { opacity: sparkOpacity },
        ]}
      />

      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowPulse }],
          },
        ]}
      />

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

      <Animated.View style={[styles.loader, { opacity: loaderOpacity }]}>
        <ActivityIndicator color={colors.primary} size="small" />
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
    glow: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 999,
      backgroundColor: 'rgba(53,88,240,0.16)',
    },
    logoArea: {
      alignItems: 'center',
    },
    logo: {
      width: 280,
      height: 204,
    },
    loader: {
      position: 'absolute',
      bottom: 64,
    },
    spark: {
      position: 'absolute',
      borderRadius: 999,
    },
    sparkTopLeft: {
      width: 12,
      height: 12,
      top: '22%',
      left: '18%',
      backgroundColor: '#3558F0',
      opacity: 0.5,
    },
    sparkBottomRight: {
      width: 8,
      height: 8,
      bottom: '28%',
      right: '20%',
      backgroundColor: '#EC4899',
      opacity: 0.5,
    },
    sparkSide: {
      width: 6,
      height: 6,
      top: '36%',
      right: '14%',
      backgroundColor: '#F59E0B',
      opacity: 0.5,
    },
  });
}
