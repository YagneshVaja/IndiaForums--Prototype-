import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import {
  getReportTypes,
  reportContent,
  type ReportTypeEntry,
} from '../../../services/api';
import { hapticError, hapticSuccess } from '../../../utils/haptics';

// ContentType=9 is the User code per /search docs in the OpenAPI spec.
const CONTENT_TYPE_USER = 9;

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: number | string;
  userHandle: string;
}

export default function ReportUserSheet({ visible, onClose, userId, userHandle }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [reasons, setReasons] = useState<ReportTypeEntry[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [reason, setReason] = useState('');
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Load reasons whenever the sheet opens. They're cheap so refetching each
  // open is fine and keeps the list current with admin changes.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoadingReasons(true);
    getReportTypes().then((list) => {
      if (cancelled) return;
      setReasons(list);
      setLoadingReasons(false);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const reset = () => {
    setReason('');
    setRemark('');
    setError(null);
    setDone(false);
    setBusy(false);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!reason) {
      setError('Pick a reason to report.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await reportContent({
      contentType: CONTENT_TYPE_USER,
      contentId: typeof userId === 'string' ? parseInt(userId, 10) : userId,
      reason,
      remark: remark.trim() || undefined,
    });
    setBusy(false);
    if (res.ok) {
      hapticSuccess();
      setDone(true);
      setTimeout(() => {
        reset();
        onClose();
      }, 1200);
    } else {
      hapticError();
      setError(res.error || 'Failed to submit report.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              Report @{userHandle}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          {done ? (
            <View style={styles.doneBox}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={styles.doneText}>Report submitted. Thank you.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Pick a reason. Reports go to our moderators — your name isn't shown to the
                reported user.
              </Text>

              {loadingReasons ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <ScrollView
                  style={styles.reasonsScroll}
                  contentContainerStyle={styles.reasons}
                  showsVerticalScrollIndicator={false}
                >
                  {reasons.map((r) => {
                    const active = r.reason === reason;
                    return (
                      <Pressable
                        key={r.reason}
                        onPress={() => {
                          setReason(r.reason);
                          if (error) setError(null);
                        }}
                        style={[styles.reason, active && styles.reasonActive]}
                      >
                        <View style={[styles.dot, active && styles.dotActive]} />
                        <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                          {r.reason}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <TextInput
                value={remark}
                onChangeText={setRemark}
                placeholder="Add a note (optional)"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                maxLength={500}
                editable={!busy}
                style={styles.input}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.footer}>
                <Pressable
                  onPress={handleClose}
                  disabled={busy}
                  style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  disabled={busy || !reason}
                  style={({ pressed }) => [
                    styles.dangerBtn,
                    pressed && styles.pressed,
                    (busy || !reason) && { opacity: 0.6 },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.dangerBtnText}>Submit report</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.scrim },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
      paddingHorizontal: 16,
      paddingBottom: 28,
      gap: 12,
      maxHeight: '85%',
    },
    dragHandle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtitle: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    loading: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    reasonsScroll: {
      maxHeight: 240,
    },
    reasons: {
      gap: 6,
      paddingVertical: 4,
    },
    reason: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    reasonActive: {
      borderColor: c.danger,
      backgroundColor: c.dangerSoft,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: c.border,
    },
    dotActive: {
      borderColor: c.danger,
      backgroundColor: c.danger,
    },
    reasonText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    reasonTextActive: {
      color: c.danger,
      fontWeight: '700',
    },
    input: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      minHeight: 70,
      textAlignVertical: 'top',
    },
    error: {
      fontSize: 12,
      color: c.danger,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      gap: 10,
    },
    ghostBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    dangerBtn: {
      flex: 2,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    pressed: { opacity: 0.88 },
    doneBox: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 12,
    },
    doneText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
  });
}
