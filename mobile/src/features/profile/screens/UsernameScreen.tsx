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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../components/EmptyState';
import { extractApiError } from '../../../services/api';
import { checkUsername } from '../../../services/authApi';

import {
  getMyUsernameHistory,
  updateMyUsername,
} from '../services/profileApi';
import { fmtDate, timeAgo } from '../utils/format';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'Username'>;

type Availability = 'idle' | 'checking' | 'available' | 'taken';

export default function UsernameScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [newName, setNewName] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const history = useQuery({
    queryKey: ['profile', 'username-history'],
    queryFn: getMyUsernameHistory,
    staleTime: 60_000,
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onChange = (value: string) => {
    setNewName(value);
    setError(null);
    setSuccess(null);
    setAvailability('idle');
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed === user?.userName) return;

    timerRef.current = setTimeout(async () => {
      setAvailability('checking');
      try {
        const res = await checkUsername(trimmed);
        setAvailability(res.data?.available !== false ? 'available' : 'taken');
      } catch {
        setAvailability('idle');
      }
    }, 500);
  };

  const save = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return setError('Username is required');
    if (trimmed.length < 3) return setError('Username must be at least 3 characters');
    if (trimmed === user?.userName) return setError('This is already your username');
    if (availability === 'taken') return setError('This username is not available');

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateMyUsername({ newUsername: trimmed });
      if (res.success) {
        updateUser({ userName: trimmed });
        setNewName('');
        setAvailability('idle');
        setSuccess(res.message || 'Username updated successfully');
        history.refetch();
      } else {
        setError(res.message || 'Failed to update username');
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to update username'));
    } finally {
      setSaving(false);
    }
  };

  const data = history.data;
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';
  const canChange = data?.canChangeUsername !== false;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Username" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current username */}
        <View style={styles.current}>
          <Text style={styles.currentLabel}>Current Username</Text>
          <Text style={styles.currentValue}>@{user?.userName || '—'}</Text>
        </View>

        {/* Change form */}
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>New Username</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.prefix}>@</Text>
            <TextInput
              value={newName}
              onChangeText={onChange}
              placeholder="Enter new username"
              placeholderTextColor={colors.textTertiary}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect={false}
              editable={canChange}
              style={styles.input}
            />
          </View>
          {availability === 'checking' ? (
            <Text style={styles.hintMuted}>Checking availability...</Text>
          ) : availability === 'available' ? (
            <Text style={styles.hintOk}>✓ Username is available</Text>
          ) : availability === 'taken' ? (
            <Text style={styles.hintErr}>✗ Username is taken</Text>
          ) : null}

          {!canChange && data?.nextChangeAllowedDate ? (
            <Text style={styles.hintMuted}>
              You can change your username again on {fmtDate(data.nextChangeAllowedDate)}.
            </Text>
          ) : null}

          {error ? <Text style={styles.errText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          <Pressable
            onPress={save}
            disabled={saving || !canChange || availability === 'checking' || availability === 'taken'}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.pressed,
              (saving || !canChange || availability === 'checking' || availability === 'taken') &&
                styles.saveBtnDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveText}>Change Username</Text>
            )}
          </Pressable>
        </View>

        {/* History */}
        <Text style={styles.historyTitle}>Change History</Text>
        {history.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : history.isError ? (
          <ErrorState message={extractApiError(history.error)} onRetry={history.refetch} />
        ) : !data || data.changeHistory.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No username changes yet"
            subtitle="Your past usernames will appear here."
          />
        ) : (
          <View style={styles.historyList}>
            {data.changeHistory.map((h) => (
              <View key={String(h.usernameChangeId)} style={styles.historyItem}>
                <View style={styles.historyNames}>
                  <Text style={styles.oldName}>{h.oldUsername}</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.textTertiary} />
                  <Text style={styles.newName}>{h.newUsername}</Text>
                </View>
                {h.lastUpdatedWhen ? (
                  <Text style={styles.historyTime}>{timeAgo(h.lastUpdatedWhen)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    current: {
      backgroundColor: c.primarySoft,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    },
    currentLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    currentValue: {
      fontSize: 20,
      fontWeight: '800',
      color: c.primary,
      marginTop: 4,
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
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      backgroundColor: c.card,
      paddingHorizontal: 12,
    },
    prefix: {
      fontSize: 15,
      fontWeight: '800',
      color: c.textTertiary,
      marginRight: 4,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: c.text,
      paddingVertical: 12,
    },
    hintMuted: {
      fontSize: 12,
      color: c.textTertiary,
    },
    hintOk: {
      fontSize: 12,
      color: '#1F9254',
      fontWeight: '700',
    },
    hintErr: {
      fontSize: 12,
      color: c.danger,
      fontWeight: '700',
    },
    errText: {
      fontSize: 13,
      color: c.danger,
      fontWeight: '600',
    },
    successText: {
      fontSize: 13,
      color: '#1F9254',
      fontWeight: '600',
    },
    saveBtn: {
      marginTop: 4,
      backgroundColor: c.primary,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },

    historyTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    historyList: { gap: 8 },
    historyItem: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    historyNames: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    oldName: {
      fontSize: 13,
      color: c.textTertiary,
      textDecorationLine: 'line-through',
    },
    newName: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    historyTime: {
      fontSize: 11,
      color: c.textTertiary,
    },
    center: {
      paddingVertical: 32,
      alignItems: 'center',
    },
  });
}
