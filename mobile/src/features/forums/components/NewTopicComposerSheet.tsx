import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createTopic, type PollData } from '../../../services/api';
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

type TopicType = { id: number; label: string; icon: keyof typeof Ionicons.glyphMap };

const TOPIC_TYPES: TopicType[] = [
  { id: 1, label: 'Discussion', icon: 'chatbubbles-outline' },
  { id: 2, label: 'Poll',       icon: 'bar-chart-outline'   },
  { id: 3, label: 'Question',   icon: 'help-circle-outline' },
  { id: 4, label: 'Vote Up',    icon: 'thumbs-up-outline'   },
];

const SUBJECT_MAX = 200;
const POLL_MAX_OPTIONS = 10;

export default function NewTopicComposerSheet({ visible, forum, flairs, onClose, onCreated }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [topicTypeId, setTopicTypeId]   = useState(1);
  const [subject,     setSubject]       = useState('');
  const [message,     setMessage]       = useState('');
  const [flairId,     setFlairId]       = useState<number | null>(null);
  const [submitting,  setSubmitting]    = useState(false);
  const [error,       setError]         = useState<string | null>(null);

  // Toggles
  const [membersOnly, setMembersOnly]   = useState(false);
  const [matured,     setMatured]       = useState(false);
  const [showSig,     setShowSig]       = useState(true);
  const [watchList,   setWatchList]     = useState(true);

  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions,  setPollOptions]  = useState(['', '']);
  const [pollMultiple, setPollMultiple] = useState(false);
  const [pollOnly,     setPollOnly]     = useState(false);

  const isPollType = topicTypeId === 2;

  const filledOptions = pollOptions.filter(o => o.trim().length > 0);
  const canSubmit = (
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    !submitting &&
    (!isPollType || filledOptions.length >= 2)
  );

  function reset() {
    setTopicTypeId(1);
    setSubject('');
    setMessage('');
    setFlairId(null);
    setError(null);
    setMembersOnly(false);
    setMatured(false);
    setShowSig(true);
    setWatchList(true);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollMultiple(false);
    setPollOnly(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function addPollOption() {
    if (pollOptions.length >= POLL_MAX_OPTIONS) return;
    setPollOptions(v => [...v, '']);
  }

  function removePollOption(idx: number) {
    if (pollOptions.length <= 2) return;
    setPollOptions(v => v.filter((_, i) => i !== idx));
  }

  function updatePollOption(idx: number, value: string) {
    setPollOptions(v => v.map((o, i) => i === idx ? value : o));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    let pollData: PollData | null = null;
    if (isPollType && filledOptions.length >= 2) {
      pollData = {
        question:      pollQuestion.trim() || undefined,
        multipleVotes: pollMultiple,
        allowReplies:  !pollOnly,
        choices:       filledOptions.map(c => ({ choice: c })),
      };
    }

    const res = await createTopic({
      forumId:           forum.id,
      subject,
      message,
      flairId,
      topicTypeId,
      hasMaturedContent: matured,
      showSignature:     showSig,
      addToWatchList:    watchList,
      membersOnly,
      pollData,
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
              {/* Topic type selector */}
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {TOPIC_TYPES.map(t => {
                  const active = topicTypeId === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      style={[styles.typeBtn, active && styles.typeBtnActive]}
                      onPress={() => setTopicTypeId(t.id)}
                    >
                      <Ionicons
                        name={t.icon}
                        size={14}
                        color={active ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Title */}
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

              {/* Flair */}
              {flairs.length > 0 && (
                <>
                  <Text style={styles.label}>Flair</Text>
                  <View style={styles.flairRow}>
                    <Pressable
                      onPress={() => setFlairId(null)}
                      style={[styles.flairPill, flairId == null && styles.flairPillActive]}
                    >
                      <Text style={[styles.flairPillText, flairId == null && styles.flairPillTextActive]}>
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
                          <Text style={[styles.flairPillText, active && { color: f.fgColor }]}>
                            {f.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Message */}
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

              {/* Poll builder */}
              {isPollType && (
                <View style={styles.pollBox}>
                  <Text style={styles.pollTitle}>Poll Settings</Text>

                  <Text style={styles.label}>Poll Question (optional)</Text>
                  <TextInput
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                    placeholder="What do you want to ask?"
                    placeholderTextColor={colors.textTertiary}
                    editable={!submitting}
                    style={styles.titleInput}
                  />

                  <Text style={[styles.label, { marginTop: 12 }]}>Options <Text style={styles.required}>Min 2</Text></Text>
                  {pollOptions.map((opt, idx) => (
                    <View key={idx} style={styles.pollOptionRow}>
                      <TextInput
                        value={opt}
                        onChangeText={v => updatePollOption(idx, v)}
                        placeholder={`Option ${idx + 1}`}
                        placeholderTextColor={colors.textTertiary}
                        editable={!submitting}
                        style={styles.pollOptionInput}
                      />
                      {pollOptions.length > 2 && (
                        <Pressable
                          style={styles.pollOptionRemove}
                          onPress={() => removePollOption(idx)}
                          hitSlop={4}
                        >
                          <Ionicons name="close-circle" size={18} color={colors.danger} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  {pollOptions.length < POLL_MAX_OPTIONS && (
                    <Pressable style={styles.addOptionBtn} onPress={addPollOption}>
                      <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                      <Text style={styles.addOptionText}>Add Option</Text>
                    </Pressable>
                  )}

                  <View style={styles.pollToggles}>
                    <CheckRow
                      label="Allow multiple votes"
                      checked={pollMultiple}
                      onToggle={() => setPollMultiple(v => !v)}
                      styles={styles}
                    />
                    <CheckRow
                      label="Poll only (no replies)"
                      checked={pollOnly}
                      onToggle={() => setPollOnly(v => !v)}
                      styles={styles}
                    />
                  </View>
                </View>
              )}

              {/* Content flags */}
              <Text style={[styles.label, { marginTop: 12 }]}>Options</Text>
              <View style={styles.togglesBox}>
                <CheckRow
                  label="Members Only"
                  checked={membersOnly}
                  onToggle={() => setMembersOnly(v => !v)}
                  styles={styles}
                />
                <CheckRow
                  label="Matured Content"
                  checked={matured}
                  onToggle={() => setMatured(v => !v)}
                  styles={styles}
                />
                <CheckRow
                  label="Show Signature"
                  checked={showSig}
                  onToggle={() => setShowSig(v => !v)}
                  styles={styles}
                />
                <CheckRow
                  label="Add to Watch List"
                  checked={watchList}
                  onToggle={() => setWatchList(v => !v)}
                  styles={styles}
                />
              </View>

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

type Styles = ReturnType<typeof makeStyles>;

function CheckRow({
  label, checked, onToggle, styles,
}: { label: string; checked: boolean; onToggle: () => void; styles: Styles }) {
  return (
    <Pressable style={styles.checkRow} onPress={onToggle}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay:    { flex: 1, justifyContent: 'flex-end' },
    backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheetWrap:  { width: '100%', maxHeight: '94%' },
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
      width: 44, height: 4, borderRadius: 3,
      backgroundColor: c.border,
      marginTop: 4, marginBottom: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerText: { flex: 1, minWidth: 0 },
    headerTitle: { fontSize: 15, fontWeight: '800', color: c.text },
    headerSub:   { fontSize: 11, color: c.textTertiary, marginTop: 1 },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    body:        { flexGrow: 0 },
    bodyContent: { paddingBottom: 12 },
    label: {
      fontSize: 11, fontWeight: '700', color: c.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.3,
      marginTop: 10, marginBottom: 6,
    },
    required: { color: c.danger, fontSize: 10 },
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    typeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    typeBtnActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    typeBtnText: {
      fontSize: 12, fontWeight: '700', color: c.textSecondary,
    },
    typeBtnTextActive: { color: '#FFFFFF' },
    titleInput: {
      borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, fontWeight: '600', color: c.text, backgroundColor: c.surface,
    },
    messageInput: {
      minHeight: 110, maxHeight: 180,
      borderWidth: 1, borderColor: c.border, borderRadius: 10,
      padding: 12, fontSize: 14, color: c.text, backgroundColor: c.surface,
    },
    charCount: {
      alignSelf: 'flex-end', fontSize: 10, fontWeight: '700',
      color: c.textTertiary, marginTop: 4,
    },
    flairRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    flairPill: {
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
    },
    flairPillActive: { backgroundColor: c.text, borderColor: c.text },
    flairPillText:   { fontSize: 11, fontWeight: '700', color: c.textSecondary },
    flairPillTextActive: { color: c.card },
    pollBox: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    pollTitle: {
      fontSize: 12, fontWeight: '800', color: c.text, marginBottom: 4,
    },
    pollOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    pollOptionInput: {
      flex: 1,
      borderWidth: 1, borderColor: c.border, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8,
      fontSize: 13, color: c.text, backgroundColor: c.card,
    },
    pollOptionRemove: { padding: 2 },
    addOptionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 4,
      paddingVertical: 6,
    },
    addOptionText: { fontSize: 12, fontWeight: '700', color: c.primary },
    pollToggles: { marginTop: 8, gap: 2 },
    togglesBox: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: c.border,
      gap: 2,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    checkBox: {
      width: 18, height: 18, borderRadius: 4,
      borderWidth: 1.5, borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
    },
    checkBoxOn: { backgroundColor: c.primary, borderColor: c.primary },
    checkLabel: { fontSize: 13, fontWeight: '600', color: c.text, flex: 1 },
    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#fef2f2', borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, marginTop: 10,
    },
    errorText: { color: c.danger, fontSize: 12, fontWeight: '600', flex: 1 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    cancelBtn: {
      flex: 1, paddingVertical: 12, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface,
    },
    cancelBtnText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    submitBtn: {
      flex: 2, flexDirection: 'row', paddingVertical: 12, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.primary,
    },
    submitBtnDisabled: { backgroundColor: '#A5B5F8' },
    submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.5 },
  });
}
