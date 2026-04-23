import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import { extractApiError } from '../../../services/api';

import { useProfile } from '../hooks/useProfile';
import {
  confirmEmail,
  resendEmailVerification,
} from '../services/profileApi';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'VerifyEmail'>;

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmailScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const profile = useProfile();
  const updateUser = useAuthStore((s) => s.updateUser);
  const authEmail = useAuthStore((s) => s.user?.email);
  const email = profile.data?.raw && 'email' in profile.data.raw
    ? (profile.data.raw as { email?: string | null }).email
    : authEmail;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return Math.max(0, c - 1);
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const handleConfirm = async () => {
    const token = code.trim();
    if (!token) return setError('Please enter the verification code.');
    setVerifying(true);
    setError(null);
    try {
      const res = await confirmEmail({ token });
      if (res.success && res.emailConfirmed) {
        updateUser({ emailVerified: true });
        setVerified(true);
      } else {
        setError(res.message || 'Invalid or expired code. Please try again.');
      }
    } catch (err) {
      setError(extractApiError(err, 'Invalid or expired code. Please try again.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendEmailVerification();
      if (res.success) {
        setCooldown(RESEND_COOLDOWN);
        Alert.alert(
          'Code sent',
          res.message || `A fresh verification code has been sent to ${res.email || email}.`,
        );
      } else {
        setError(res.message || 'Failed to resend. Try again later.');
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to resend. Try again later.'));
    } finally {
      setResending(false);
    }
  };

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  // ── Success state ─────────────────────────────────────────────────────────
  if (verified) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle={statusBarStyle} />
        <TopNavBack title="Email Verified" onBack={() => navigation.goBack()} />
        <View style={[styles.successWrap, { paddingTop: insets.top + 8 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>Email Verified</Text>
          <Text style={styles.successBody}>
            Your email has been verified successfully. You're all set!
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Verify Email" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <View style={styles.mailIcon}>
            <Ionicons name="mail-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to{' '}
            <Text style={styles.emailHighlight}>{email || 'your email'}</Text>.
            Enter the code below to confirm your account.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Verification code</Text>
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            placeholder="Enter 6-digit code"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={8}
            editable={!verifying}
            style={styles.input}
          />

          {error ? <Text style={styles.errText}>{error}</Text> : null}

          <Pressable
            onPress={handleConfirm}
            disabled={verifying}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              verifying && styles.btnDisabled,
            ]}
          >
            {verifying ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify Email</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.resendSection}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          <Pressable
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
            style={({ pressed }) => [
              styles.resendBtn,
              pressed && styles.pressed,
              (cooldown > 0 || resending) && styles.btnDisabled,
            ]}
          >
            {resending ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.resendBtnText}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('EmailLogs')}
            style={({ pressed }) => [styles.resendBtn, pressed && styles.pressed]}
          >
            <Text style={styles.logsBtnText}>See email history</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },

    intro: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      gap: 10,
    },
    mailIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    emailHighlight: {
      fontWeight: '800',
      color: c.primary,
    },

    formCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      gap: 10,
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 18,
      letterSpacing: 4,
      textAlign: 'center',
      color: c.text,
      fontWeight: '700',
    },
    errText: {
      fontSize: 13,
      color: c.danger,
      fontWeight: '600',
    },

    primaryBtn: {
      marginTop: 4,
      backgroundColor: c.primary,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    btnDisabled: { opacity: 0.6 },
    pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },

    resendSection: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    resendText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    resendBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    resendBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: c.primary,
    },
    logsBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      textDecorationLine: 'underline',
    },

    // Success state
    successWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#1F9254',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
    },
    successBody: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 12,
    },
  });
}
