import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createTopic } from '../../../services/api';
import type { Forum, ForumFlair } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  visible: boolean;
  forum: Forum;
  flairs: ForumFlair[];
  onClose: () => void;
  onCreated: (topicId: number | null) => void;
}

const SUBJECT_MAX = 200;

export default function NewTopicComposerSheet({ visible, forum, flairs, onClose, onCreated }: Props) {
  const [subject, setSubject]       = useState('');
  const [message, setMessage]       = useState('');
  const [flairId, setFlairId]       = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !submitting;

  function reset() {
    setSubject('');
    setMessage('');
    setFlairId(null);
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    const res = await createTopic({
      forumId: forum.id,
      subject,
      message,
      flairId,
    });
    setSubmitting(false);
    if (res.ok) {
      reset();
      onCreated(res.topicId);
    } else {
      setError(res.error || 'Failed to create topic.');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />

            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>New Topic</Text>
                <Text style={styles.headerSub} numberOfLines={1}>in {forum.name}</Text>
              </View>
              <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>
                Title <Text style={styles.required}>Required</Text>
              </Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textTertiary}
                maxLength={SUBJECT_MAX}
                editable={!submitting}
                style={styles.titleInput}
              />
              <Text style={styles.charCount}>{subject.length}/{SUBJECT_MAX}</Text>

              {flairs.length > 0 && (
                <>
                  <Text style={styles.label}>Flair</Text>
                  <View style={styles.flairRow}>
                    <Pressable
                      onPress={() => setFlairId(null)}
                      style={[styles.flairPill, flairId == null && styles.flairPillActive]}
                    >
                      <Text
                        style={[
                          styles.flairPillText,
                          flairId == null && styles.flairPillTextActive,
                        ]}
                      >
                        None
                      </Text>
                    </Pressable>
                    {flairs.map(f => {
                      const active = flairId === f.id;
                      return (
                        <Pressable
                          key={f.id}
                          onPress={() => setFlairId(f.id)}
                          style={[
                            styles.flairPill,
                            active && { backgroundColor: f.bgColor, borderColor: f.bgColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.flairPillText,
                              active && { color: f.fgColor },
                            ]}
                          >
                            {f.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              <Text style={styles.label}>
                Message <Text style={styles.required}>Required</Text>
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Start the discussion…"
                placeholderTextColor={colors.textTertiary}
                multiline
                editable={!submitting}
                style={styles.messageInput}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{message.trim().length} chars</Text>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                onPress={handleClose}
                disabled={submitting}
                style={[styles.cancelBtn, submitting && styles.btnDisabled]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Post Topic</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheetWrap: { width: '100%', maxHeight: '92%' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 16,
      paddingHorizontal: 16,
      paddingTop: 8,
      maxHeight: '100%',
    },
    dragHandle: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 3,
      backgroundColor: c.border,
      marginTop: 4,
      marginBottom: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerText: { flex: 1, minWidth: 0 },
    headerTitle: { fontSize: 15, fontWeight: '800', color: c.text },
    headerSub: { fontSize: 11, color: c.textTertiary, marginTop: 1 },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    body: { flexGrow: 0 },
    bodyContent: { paddingBottom: 12 },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginTop: 10,
      marginBottom: 6,
    },
    required: { color: c.danger, fontSize: 10 },
    titleInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
      backgroundColor: c.surface,
    },
    messageInput: {
      minHeight: 120,
      maxHeight: 200,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.surface,
    },
    charCount: {
      alignSelf: 'flex-end',
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
      marginTop: 4,
    },
    flairRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    flairPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    flairPillActive: {
      backgroundColor: c.text,
      borderColor: c.text,
    },
    flairPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    flairPillTextActive: {
      color: c.card,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#fef2f2',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 10,
    },
    errorText: { color: c.danger, fontSize: 12, fontWeight: '600', flex: 1 },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    cancelBtnText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    submitBtn: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.primary,
    },
    submitBtnDisabled: { backgroundColor: '#A5B5F8' },
    submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.5 },
  });
}
