import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';
import AuthInput from '../components/AuthInput';
import { forgotPassword } from '../../../services/authApi';
import { extractApiError } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return; }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(extractApiError(err, 'Failed to send reset email. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.screen, styles.sentScreen, { paddingTop: insets.top }]}>
        <View style={styles.sentIconWrapper}>
          <Ionicons name="mail-open-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.sentTitle}>Check your inbox</Text>
        <Text style={styles.sentSubtitle}>
          We sent a password reset link to{'\n'}
          <Text style={styles.sentEmail}>{email}</Text>
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Back to Sign In</Text>
        </Pressable>
        <Pressable
          onPress={() => { setSent(false); setEmail(''); }}
          hitSlop={12}
          style={styles.resendButton}
        >
          <Text style={styles.resendText}>Didn't receive it? Resend</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.iconWrapper}>
          <Ionicons name="lock-open-outline" size={36} color={colors.primary} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={styles.form}>
          <AuthInput
            label="Email address"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            error={error}
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleSend}
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.primaryButtonLoading,
            ]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Link</Text>
            )}
          </Pressable>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Ionicons name="arrow-back" size={14} color={colors.primary} />
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
            <Text style={styles.footerLink}> Back to Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.card,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 16,
    },
    sentScreen: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 14,
    },
    sentIconWrapper: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    sentTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
    },
    sentSubtitle: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    sentEmail: {
      fontWeight: '700',
      color: c.text,
    },
    resendButton: {
      marginTop: 4,
    },
    resendText: {
      fontSize: 14,
      color: c.primary,
      fontWeight: '600',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28,
    },
    iconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    header: {
      gap: 10,
      marginBottom: 32,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 21,
    },
    form: {
      gap: 18,
    },
    primaryButton: {
      backgroundColor: c.primary,
      height: 54,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 6,
    },
    primaryButtonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    primaryButtonLoading: {
      opacity: 0.8,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 32,
    },
    footerLink: {
      fontSize: 14,
      color: c.primary,
      fontWeight: '600',
    },
  });
}
