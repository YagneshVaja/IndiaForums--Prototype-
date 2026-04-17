import React, { useState } from 'react';
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

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    // Navigate to main after login
    navigation.getParent()?.navigate('Main' as never);
  };

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
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>IF</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your IndiaForums journey</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <AuthInput
            label="Email address"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: undefined })); }}
            error={errors.email}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <AuthInput
            label="Password"
            icon="lock-closed-outline"
            placeholder="Your password"
            value={password}
            onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: undefined })); }}
            error={errors.password}
            isPassword
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <Pressable
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, loading && styles.primaryButtonLoading]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <Pressable style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}>
              <Text style={styles.socialIcon}>G</Text>
              <Text style={styles.socialText}>Google</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}>
              <Ionicons name="logo-facebook" size={18} color="#1877F2" />
              <Text style={styles.socialText}>Facebook</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.footerText}>New to IndiaForums?</Text>
          <Pressable onPress={() => navigation.replace('Register')} hitSlop={8}>
            <Text style={styles.footerLink}> Create Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEEFF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#3558F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#3558F0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 13,
    color: '#5F5F5F',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: '#3558F0',
  },
  primaryButton: {
    backgroundColor: '#3558F0',
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonPressed: {
    backgroundColor: '#2946D4',
  },
  primaryButtonLoading: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E2E2',
  },
  dividerText: {
    fontSize: 12,
    color: '#9E9E9E',
    textTransform: 'uppercase',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  socialButtonPressed: {
    borderColor: '#CACACA',
  },
  socialIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EA4335',
  },
  socialText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#5F5F5F',
  },
  footerLink: {
    fontSize: 13,
    color: '#3558F0',
    fontWeight: '600',
  },
});
