import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../../navigation/types';
import { markOnboardingComplete } from '../../../store/onboardingStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

const SPLASH_LOGO = require('../../../../assets/splash-logo.png');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GetStarted'>;

export default function GetStartedScreen({ navigation }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerY,       { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(buttonsY,       { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 200);
  }, [headerOpacity, headerY, buttonsOpacity, buttonsY]);

  const handleCreateAccount = () => {
    markOnboardingComplete();
    navigation.getParent()?.navigate('Auth', { screen: 'Register' });
  };

  const handleSignIn = () => {
    markOnboardingComplete();
    navigation.getParent()?.navigate('Auth', { screen: 'Login' });
  };

  const handleGuest = () => {
    markOnboardingComplete();
    navigation.getParent()?.navigate('Guest');
  };

  return (
    <LinearGradient
      colors={['#FFF7ED', '#FED7AA', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {/* Decorative accent dots */}
      <View style={[styles.spark, { top: '14%', left: '18%', width: 14, height: 14, backgroundColor: '#3558F0' }]} />
      <View style={[styles.spark, { top: '22%', right: '20%', width: 10, height: 10, backgroundColor: '#EC4899' }]} />
      <View style={[styles.spark, { top: '36%', right: '14%', width: 7,  height: 7,  backgroundColor: '#10B981' }]} />
      <View style={[styles.spark, { top: '40%', left: '10%', width: 9,  height: 9,  backgroundColor: '#F59E0B' }]} />

      <Animated.View style={[styles.header, {
        opacity: headerOpacity,
        transform: [{ translateY: headerY }],
      }]}>
        <Image source={SPLASH_LOGO} style={styles.lockup} resizeMode="contain" />
        <Text style={styles.tagline}>
          {'Join millions of fans.\nYour community awaits.'}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.actions, {
        opacity: buttonsOpacity,
        transform: [{ translateY: buttonsY }],
      }]}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={handleCreateAccount}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.outlineButton, pressed && styles.outlineButtonPressed]}
          onPress={handleSignIn}
        >
          <Text style={styles.outlineButtonText}>Sign In</Text>
        </Pressable>

        <Pressable style={styles.ghostButton} onPress={handleGuest} hitSlop={8}>
          <Text style={styles.ghostButtonText}>Continue as Guest</Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}

const PRIMARY_BLUE = '#3558F0';

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 100 : 80,
      paddingBottom: Platform.OS === 'ios' ? 52 : 36,
      paddingHorizontal: 24,
    },
    header: {
      alignItems: 'center',
      gap: 18,
      width: '100%',
    },
    lockup: {
      width: 240,
      height: 175,
    },
    tagline: {
      fontSize: 22,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
      lineHeight: 30,
      letterSpacing: -0.4,
      maxWidth: 320,
    },
    actions: {
      width: '100%',
      gap: 12,
      alignItems: 'center',
    },
    primaryButton: {
      width: '100%',
      backgroundColor: PRIMARY_BLUE,
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: PRIMARY_BLUE,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 4,
    },
    primaryButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    outlineButton: {
      width: '100%',
      paddingVertical: 16.5,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PRIMARY_BLUE,
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },
    outlineButtonPressed: {
      backgroundColor: 'rgba(53,88,240,0.06)',
    },
    outlineButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: PRIMARY_BLUE,
    },
    ghostButton: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    ghostButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textSecondary,
    },
    spark: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.55,
    },
  });
}
