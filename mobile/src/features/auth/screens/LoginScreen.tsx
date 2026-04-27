import React, { useEffect, useMemo, useState } from 'react';
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
import {
  isFacebookConfigured,
  isGoogleConfigured,
  isMicrosoftConfigured,
  useFacebookSignIn,
  useGoogleSignIn,
  useMicrosoftSignIn,
} from '../../../services/socialAuth';
import type { SocialProvider } from '../../../services/socialAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const login = useAuthStore(s => s.login);
  const externalLogin = useAuthStore(s => s.externalLogin);

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ userName?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  const google = useGoogleSignIn();
  const facebook = useFacebookSignIn();
  const microsoft = useMicrosoftSignIn();

  // Once any provider resolves a SocialResult, post it to /auth/external-login.
  useEffect(() => {
    const providerResult = google.result ?? facebook.result ?? microsoft.result;
    if (!providerResult) return;
    (async () => {
      try {
        await externalLogin(providerResult);
        navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
      } catch (err) {
        setServerError(extractApiError(err, `${providerResult.provider} sign-in failed.`));
      } finally {
        setSocialLoading(null);
      }
    })();
  }, [google.result, facebook.result, microsoft.result, externalLogin, navigation]);

  const validate = () => {
    const e: typeof errors = {};
    if (!userName.trim()) e.userName = 'Email or username is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ userName: userName.trim(), password });
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      setServerError(extractApiError(err, 'Invalid username or password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: SocialProvider) => {
    setServerError('');
    setSocialLoading(provider);
    try {
      if (provider === 'Google') await google.promptGoogle();
      else if (provider === 'Facebook') await facebook.promptFacebook();
      else if (provider === 'Microsoft') await microsoft.promptMicrosoft();
    } catch (err) {
      setServerError(extractApiError(err, `${provider} sign-in failed.`));
      setSocialLoading(null);
    }
    // The providers resolve asynchronously via useEffect above; if the user
    // cancels the sheet we'll still be in "loading" — reset on next tick.
    setTimeout(() => setSocialLoading(prev => (prev === provider ? null : prev)), 1500);
  };

  const isBusy = loading || socialLoading !== null;

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
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>IF</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your IndiaForums journey</Text>
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
            label="Email or Username"
            icon="person-outline"
            placeholder="you@example.com or username"
            value={userName}
            onChangeText={t => { setUserName(t); setErrors(e => ({ ...e, userName: undefined })); }}
            error={errors.userName}
            autoCapitalize="none"
            autoCorrect={false}
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
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, isBusy && styles.primaryButtonLoading]}
            onPress={handleLogin}
            disabled={isBusy}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          {(isGoogleConfigured || isFacebookConfigured || isMicrosoftConfigured) && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                {isGoogleConfigured && (
                  <Pressable
                    style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
                    onPress={() => handleSocial('Google')}
                    disabled={isBusy || !google.ready}
                  >
                    {socialLoading === 'Google' ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Text style={styles.socialIcon}>G</Text>
                        <Text style={styles.socialText}>Google</Text>
                      </>
                    )}
                  </Pressable>
                )}
                {isFacebookConfigured && (
                  <Pressable
                    style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
                    onPress={() => handleSocial('Facebook')}
                    disabled={isBusy || !facebook.ready}
                  >
                    {socialLoading === 'Facebook' ? (
                      <ActivityIndicator size="small" color="#1877F2" />
                    ) : (
                      <>
                        <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                        <Text style={styles.socialText}>Facebook</Text>
                      </>
                    )}
                  </Pressable>
                )}
                {isMicrosoftConfigured && (
                  <Pressable
                    style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
                    onPress={() => handleSocial('Microsoft')}
                    disabled={isBusy || !microsoft.ready}
                  >
                    {socialLoading === 'Microsoft' ? (
                      <ActivityIndicator size="small" color="#00A4EF" />
                    ) : (
                      <>
                        <Ionicons name="logo-microsoft" size={18} color="#00A4EF" />
                        <Text style={styles.socialText}>Microsoft</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
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
      backgroundColor: c.surface,
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
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    logoText: {
      fontSize: 22,
      fontWeight: '800',
      color: c.onPrimary,
      letterSpacing: -0.3,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: c.text,
    },
    subtitle: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
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
    forgotLink: {
      alignSelf: 'flex-end',
      marginTop: -4,
    },
    forgotText: {
      fontSize: 13,
      color: c.primary,
    },
    primaryButton: {
      backgroundColor: c.primary,
      height: 46,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryButtonPressed: {
      opacity: 0.88,
    },
    primaryButtonLoading: {
      opacity: 0.8,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.onPrimary,
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
      backgroundColor: c.border,
    },
    dividerText: {
      fontSize: 12,
      color: c.textTertiary,
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
      borderColor: c.border,
      backgroundColor: c.card,
      gap: 8,
    },
    socialButtonPressed: {
      borderColor: c.textTertiary,
    },
    socialIcon: {
      fontSize: 14,
      fontWeight: '700',
      color: '#EA4335',
    },
    socialText: {
      fontSize: 12,
      fontWeight: '500',
      color: c.text,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    footerText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    footerLink: {
      fontSize: 13,
      color: c.primary,
      fontWeight: '600',
    },
  });
}
