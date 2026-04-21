import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../../navigation/types';
import { markOnboardingComplete } from '../../../store/onboardingStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

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
      Animated.timing(headerY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(buttonsY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 200);
  }, []);

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
    <View style={styles.container}>
      <Animated.View style={[styles.header, {
        opacity: headerOpacity,
        transform: [{ translateY: headerY }],
      }]}>
        <View style={styles.logoMark}>
          <Text style={styles.logoInitial}>IF</Text>
        </View>
        <Text style={styles.brandName}>IndiaForums</Text>
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
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 100 : 80,
      paddingBottom: Platform.OS === 'ios' ? 52 : 36,
      paddingHorizontal: 32,
    },
    header: {
      alignItems: 'center',
      gap: 16,
    },
    logoMark: {
      width: 80,
      height: 80,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    logoInitial: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -1,
    },
    brandName: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.72)',
      textAlign: 'center',
      lineHeight: 24,
      marginTop: 4,
    },
    actions: {
      width: '100%',
      gap: 12,
      alignItems: 'center',
    },
    primaryButton: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    primaryButtonPressed: {
      opacity: 0.9,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.primary,
    },
    outlineButton: {
      width: '100%',
      paddingVertical: 15,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.5)',
      alignItems: 'center',
    },
    outlineButtonPressed: {
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    outlineButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    ghostButton: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    ghostButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.6)',
      textDecorationLine: 'underline',
    },
  });
}
