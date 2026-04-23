import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import { forgotPassword } from '../../../services/authApi';
import { extractApiError } from '../../../services/api';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'ChangePassword'>;

/**
 * Change Password is implemented via the password-reset-by-email flow — the
 * API doesn't expose a direct "change password while signed in" endpoint.
 * We trigger /auth/forgot-password with the current user's email; they finish
 * the change by clicking the emailed link.
 */
export default function ChangePasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const user = useAuthStore((s) => s.user);
  const email = user?.email ?? '';

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  const sendLink = async () => {
    if (!email) return setError('No email is associated with your account.');
    setSending(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(extractApiError(err, 'Failed to send reset email. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Change Password" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      >
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={sent ? 'checkmark-done' : 'key-outline'}
              size={32}
              color={sent ? '#1F9254' : colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {sent ? 'Check your inbox' : 'Reset your password'}
          </Text>
          <Text style={styles.subtitle}>
            {sent
              ? `We sent a password reset link to ${email}. Tap the link in your email to finish changing your password.`
              : `We'll send a password-reset link to ${email}. Tap the link to set a new password.`}
          </Text>
        </View>

        {!sent ? (
          <View style={styles.card}>
            <Text style={styles.hint}>
              For your security, password changes go through an email link — that way nobody
              who grabs your device can silently change your password.
            </Text>
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <Pressable
              onPress={sendLink}
              disabled={sending || !email}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
                (sending || !email) && styles.btnDisabled,
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={16} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Pressable
              onPress={() => void Linking.openURL('mailto:')}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            >
              <Ionicons name="mail-open-outline" size={16} color="#FFF" />
              <Text style={styles.primaryBtnText}>Open Email App</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setSent(false);
                setError(null);
              }}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ghostBtnText}>Send again</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    hero: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 16,
      gap: 10,
    },
    iconWrap: {
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
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    hint: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 18,
    },
    err: {
      fontSize: 13,
      color: c.danger,
      fontWeight: '600',
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 46,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    primaryBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    btnDisabled: { opacity: 0.6 },
    pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
    ghostBtn: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    ghostBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
  });
}
