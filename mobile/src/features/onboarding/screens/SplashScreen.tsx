import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('OnboardingSlides');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoArea, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoMark}>
          <Text style={styles.logoInitial}>IF</Text>
        </View>
        <Text style={styles.brandName}>IndiaForums</Text>
        <Text style={styles.tagline}>India's Premier Fan Community</Text>
      </Animated.View>

      <ActivityIndicator style={styles.loader} color={colors.primary} size="small" />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoArea: {
      alignItems: 'center',
      gap: 12,
    },
    logoMark: {
      width: 80,
      height: 80,
      borderRadius: 22,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
    },
    logoInitial: {
      fontSize: 32,
      fontWeight: '800',
      color: c.onPrimary,
      letterSpacing: -1,
    },
    brandName: {
      fontSize: 28,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 14,
      color: c.textTertiary,
      letterSpacing: 0.2,
    },
    loader: {
      position: 'absolute',
      bottom: 60,
    },
  });
}
