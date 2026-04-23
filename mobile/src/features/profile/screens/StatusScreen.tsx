import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { extractApiError } from '../../../services/api';
import { getMyStatus, updateMyStatus } from '../services/profileApi';
import { fmtDate } from '../utils/format';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'Status'>;

// Status codes match the IndiaForums user-status enum:
// 1 = Active/Online, 2 = Offline, 3 = Away, 4 = Busy, 5 = Invisible.
const STATUS_OPTIONS = [
  { code: 1, label: 'Online', desc: 'Available to chat', color: '#1F9254' },
  { code: 3, label: 'Away', desc: 'You may be slow to reply', color: '#B26A00' },
  { code: 4, label: 'Busy', desc: 'Do not disturb', color: '#C8001E' },
  { code: 5, label: 'Invisible', desc: 'Appear offline to others', color: '#555555' },
];

export default function StatusScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const q = useQuery({
    queryKey: ['profile', 'status'],
    queryFn: getMyStatus,
    staleTime: 30_000,
  });

  const [selected, setSelected] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) {
      const code = typeof q.data.statusCode === 'string'
        ? parseInt(q.data.statusCode, 10)
        : q.data.statusCode;
      if (Number.isFinite(code)) setSelected(Number(code));
    }
  }, [q.data]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateMyStatus({ statusCode: selected });
      if (res.success) {
        setSuccess(res.message || 'Status updated');
        q.refetch();
      } else {
        setError(res.message || 'Failed to update status');
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to update status'));
    } finally {
      setSaving(false);
    }
  };

  const current = STATUS_OPTIONS.find((o) => o.code === selected) ?? STATUS_OPTIONS[0];
  const canChange = q.data?.canChangeStatus !== false;
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Status" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      >
        {q.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : (
          <>
            {/* Preview */}
            <View style={styles.preview}>
              <View style={[styles.previewDot, { backgroundColor: current.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>{current.label}</Text>
                <Text style={styles.previewSub}>{current.desc}</Text>
              </View>
            </View>

            {q.data?.lockoutEnd ? (
              <View style={styles.warning}>
                <Ionicons name="lock-closed-outline" size={14} color="#B26A00" />
                <Text style={styles.warningText}>
                  Your account is locked until {fmtDate(q.data.lockoutEnd)}.
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Set Status</Text>
            <View style={styles.optionList}>
              {STATUS_OPTIONS.map((opt, i) => {
                const active = opt.code === selected;
                return (
                  <Pressable
                    key={opt.code}
                    onPress={() => canChange && setSelected(opt.code)}
                    style={({ pressed }) => [
                      styles.option,
                      i < STATUS_OPTIONS.length - 1 && styles.optionBorder,
                      active && styles.optionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.optionDot, { backgroundColor: opt.color }]} />
                    <View style={styles.optionBody}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.errText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <Pressable
              onPress={save}
              disabled={saving || !canChange}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressed,
                (saving || !canChange) && styles.saveBtnDisabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveText}>Save Status</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
    },
    previewDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    previewLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
    },
    previewSub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    warning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#FCD38A',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      color: '#92400E',
      fontWeight: '500',
    },

    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
      paddingLeft: 4,
    },
    optionList: {
      backgroundColor: c.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    optionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    optionActive: {
      backgroundColor: c.primarySoft,
    },
    optionDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    optionBody: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    optionDesc: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    errText: {
      fontSize: 13,
      color: c.danger,
      fontWeight: '600',
      marginTop: 14,
    },
    successText: {
      fontSize: 13,
      color: '#1F9254',
      fontWeight: '600',
      marginTop: 14,
    },
    saveBtn: {
      marginTop: 18,
      backgroundColor: c.primary,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    pressed: { opacity: 0.9 },
  });
}
