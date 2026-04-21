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
import { useAuthStore } from '../../../store/authStore';
import { extractApiError } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// Server-side field keys are case-insensitive; map to our form field names.
// Mirrors indiaforums/src/screens/onboarding/RegisterScreen.jsx:60-68.
const SERVER_FIELD_MAP: Record<string, string> = {
  username: 'username',
  email: 'email',
  password: 'password',
  displayname: 'fullName',
};

const SUCCESS_GREEN = '#22C55E';

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const register = useAuthStore(s => s.register);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [serverError, setServerError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form) => (val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.username.trim()) e.username = 'Username is required';
    else if (form.username.length < 3) e.username = 'At least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) e.username = 'Letters, numbers and _ only';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'At least 8 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        userName: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        displayName: form.fullName.trim() || undefined,
      });
      setSuccess(true);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (err as any)?.response?.data;
      if (data?.errors && typeof data.errors === 'object') {
        const mapped: Partial<typeof form> = {};
        for (const [key, msgs] of Object.entries(data.errors)) {
          const field = SERVER_FIELD_MAP[key.toLowerCase()] ?? key;
          if (field in form) {
            mapped[field as keyof typeof form] = Array.isArray(msgs)
              ? String(msgs[0])
              : String(msgs);
          }
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          setLoading(false);
          return;
        }
      }
      setServerError(extractApiError(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.screen, styles.successScreen, { paddingTop: insets.top }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>Account Created!</Text>
        <Text style={styles.successSubtitle}>
          Welcome to IndiaForums, {form.fullName.split(' ')[0]}!{'\n'}You're all set to join the community.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] })}
        >
          <Text style={styles.primaryButtonText}>Start Exploring</Text>
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
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join India's biggest fan community</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {serverError !== '' && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          )}

          <AuthInput
            label="Full Name"
            icon="person-outline"
            placeholder="Your full name"
            value={form.fullName}
            onChangeText={set('fullName')}
            error={errors.fullName}
            returnKeyType="next"
          />
          <AuthInput
            label="Username"
            icon="at-outline"
            placeholder="Choose a username"
            value={form.username}
            onChangeText={set('username')}
            error={errors.username}
            returnKeyType="next"
          />
          <AuthInput
            label="Email address"
            icon="mail-outline"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={set('email')}
            error={errors.email}
            keyboardType="email-address"
            returnKeyType="next"
          />
          <AuthInput
            label="Password"
            icon="lock-closed-outline"
            placeholder="Min. 8 characters"
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            isPassword
            returnKeyType="next"
          />
          <AuthInput
            label="Confirm Password"
            icon="shield-checkmark-outline"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChangeText={set('confirmPassword')}
            error={errors.confirmPassword}
            isPassword
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.primaryButtonLoading,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.replace('Login')} hitSlop={8}>
            <Text style={styles.footerLink}> Sign In</Text>
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
    successScreen: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 16,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: SUCCESS_GREEN,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      shadowColor: SUCCESS_GREEN,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    successTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.5,
    },
    successSubtitle: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
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
    header: {
      marginBottom: 32,
      gap: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: c.textSecondary,
      lineHeight: 21,
    },
    form: {
      gap: 16,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.danger,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    errorBannerText: {
      flex: 1,
      color: c.danger,
      fontSize: 13,
      lineHeight: 18,
    },
    termsText: {
      fontSize: 12,
      color: c.textTertiary,
      lineHeight: 18,
      marginTop: -4,
    },
    termsLink: {
      color: c.primary,
      fontWeight: '600',
    },
    primaryButton: {
      backgroundColor: c.primary,
      height: 54,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
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
      marginTop: 28,
    },
    footerText: {
      fontSize: 14,
      color: c.textTertiary,
    },
    footerLink: {
      fontSize: 14,
      color: c.primary,
      fontWeight: '700',
    },
  });
}
