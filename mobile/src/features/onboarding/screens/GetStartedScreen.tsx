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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../../navigation/types';
import { markOnboardingComplete } from '../../../store/onboardingStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

const SPLASH_LOGO = require('../../../../assets/splash-logo.png');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GetStarted'>;

const FEATURES = [
  {
    icon: 'people' as const,
    tint: '#3558F0',
    bg: '#EEF2FF',
    label: 'Active Forums',
    desc: 'Live discussions',
  },
  {
    icon: 'newspaper' as const,
    tint: '#F59E0B',
    bg: '#FFF7ED',
    label: 'Breaking News',
    desc: 'Hourly updates',
  },
  {
    icon: 'star' as const,
    tint: '#10B981',
    bg: '#ECFDF5',
    label: 'Fan Stories',
    desc: 'Read & write',
  },
] as const;

export default function GetStartedScreen({ navigation }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresY = useRef(new Animated.Value(20)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerY,       { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(featuresOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(featuresY,       { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 150);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(buttonsY,       { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 350);
  }, [headerOpacity, headerY, featuresOpacity, featuresY, buttonsOpacity, buttonsY]);

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
      <View style={[styles.spark, { top: '10%', left: '14%', width: 14, height: 14, backgroundColor: '#3558F0' }]} />
      <View style={[styles.spark, { top: '16%', right: '18%', width: 10, height: 10, backgroundColor: '#EC4899' }]} />
      <View style={[styles.spark, { top: '52%', right: '8%',  width: 7,  height: 7,  backgroundColor: '#10B981' }]} />
      <View style={[styles.spark, { top: '56%', left: '8%',   width: 9,  height: 9,  backgroundColor: '#F59E0B' }]} />

      {/* Header — logo + tagline */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerY }],
          },
        ]}
      >
        <Image source={SPLASH_LOGO} style={styles.lockup} resizeMode="contain" />
        <Text style={styles.tagline}>
          {'Join millions of fans.\nYour community awaits.'}
        </Text>
      </Animated.View>

      {/* Feature row — 3 value props */}
      <Animated.View
        style={[
          styles.featuresWrap,
          {
            opacity: featuresOpacity,
            transform: [{ translateY: featuresY }],
          },
        ]}
      >
        <View style={styles.divider} />
        <View style={styles.featuresRow}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={24} color={f.tint} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
        <View style={styles.divider} />
      </Animated.View>

      {/* CTAs */}
      <Animated.View
        style={[
          styles.actions,
          {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsY }],
          },
        ]}
      >
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
      paddingTop: Platform.OS === 'ios' ? 80 : 56,
      paddingBottom: Platform.OS === 'ios' ? 44 : 28,
      paddingHorizontal: 24,
    },
    header: {
      alignItems: 'center',
      gap: 16,
      width: '100%',
    },
    lockup: {
      width: 220,
      height: 160,
    },
    tagline: {
      fontSize: 20,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
      lineHeight: 28,
      letterSpacing: -0.4,
      maxWidth: 320,
    },
    featuresWrap: {
      width: '100%',
      gap: 18,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(15,23,42,0.08)',
      width: '100%',
    },
    featuresRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    featureCard: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    featureIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    featureLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.2,
      textAlign: 'center',
    },
    featureDesc: {
      fontSize: 11,
      fontWeight: '500',
      color: c.textSecondary,
      textAlign: 'center',
      letterSpacing: 0.1,
    },
    actions: {
      width: '100%',
      gap: 10,
      alignItems: 'center',
    },
    primaryButton: {
      width: '100%',
      backgroundColor: PRIMARY_BLUE,
      paddingVertical: 17,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: PRIMARY_BLUE,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.20,
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
      paddingVertical: 15.5,
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
      paddingVertical: 6,
      alignItems: 'center',
    },
    ghostButtonText: {
      fontSize: 14,
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
