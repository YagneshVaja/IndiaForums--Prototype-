import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { replyToTopic } from '../../../services/api';
import type { ForumTopic } from '../../../services/api';

interface Props {
  visible: boolean;
  topic: ForumTopic;
  onClose: () => void;
  onSubmitted: () => void;
}

const MIN_CHARS = 1;

export default function ReplyComposerSheet({ visible, topic, onClose, onSubmitted }: Props) {
  const [text, setText]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const charCount = text.trim().length;
  const canSubmit = charCount >= MIN_CHARS && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    const res = await replyToTopic(topic.id, topic.forumId, text);
    setSubmitting(false);
    if (res.ok) {
      setText('');
      onSubmitted();
    } else {
      setError(res.error || 'Failed to send reply.');
    }
  }

  function handleClose() {
    if (submitting) return;
    setError(null);
    onClose();
  }

  const topicSnippet = (topic.title || '').length > 32
    ? topic.title.slice(0, 32) + '…'
    : topic.title || 'topic';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>?</Text>
                </View>
                <View style={styles.headerMeta}>
                  <Text style={styles.headerTitle}>Post a Reply</Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    in {topicSnippet}
                  </Text>
                </View>
              </View>
              <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#1A1A1A" />
              </Pressable>
            </View>

            <View style={styles.editorWrap}>
              <Text style={styles.sectionLabel}>
                Message <Text style={styles.required}>Required</Text>
              </Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Share your thoughts…"
                placeholderTextColor="#B0B0B0"
                multiline
                editable={!submitting}
                style={styles.editor}
                autoFocus
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{charCount} chars</Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

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
                    <Ionicons name="send" size={14} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#E2E2E2',
    marginTop: 4,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3558F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  headerSub: {
    fontSize: 11,
    color: '#8A8A8A',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEEFF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  required: {
    color: '#dc2626',
    fontSize: 10,
  },
  editorWrap: {
    marginBottom: 12,
  },
  editor: {
    minHeight: 140,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 10,
    fontWeight: '700',
    color: '#8A8A8A',
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F7',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5A5A5A',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3558F0',
  },
  submitBtnDisabled: {
    backgroundColor: '#A5B5F8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
