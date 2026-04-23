import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  closeTopic, openTopic, trashTopic, restoreTopic,
  updateTopicSubject, updateTopicAdminSettings, getTopicActionHistory,
  type ForumTopic, type TopicActionLog,
} from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  visible:         boolean;
  topic:           ForumTopic;
  canEdit:         boolean;
  canModerate:     boolean;
  canDelete:       boolean;
  onClose:         () => void;
  onActionComplete: (action: ActionKey) => void;
}

export type ActionKey =
  | 'edit' | 'lock' | 'pin'
  | 'trash' | 'restore' | 'history';

interface MenuItem {
  key:      ActionKey;
  label:    string;
  icon:     keyof typeof Ionicons.glyphMap;
  iconBg:   string;
  iconColor: string;
  danger?:  boolean;
}

export default function TopicModActionsSheet({
  visible, topic, canEdit, canModerate, canDelete, onClose, onActionComplete,
}: Props) {
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);

  const [editSubject,   setEditSubject]   = useState('');
  const [historyLogs,   setHistoryLogs]   = useState<TopicActionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];
    if (canEdit) {
      items.push({ key: 'edit', label: 'Edit Topic', icon: 'create-outline', iconBg: '#E8EEFF', iconColor: '#3558F0' });
    }
    if (canModerate) {
      items.push({
        key:   'lock',
        label: topic.locked ? 'Unlock Topic' : 'Lock Topic',
        icon:  topic.locked ? 'lock-open-outline' : 'lock-closed-outline',
        iconBg: '#FEF3C7', iconColor: '#d97706',
      });
      items.push({
        key:   'pin',
        label: topic.pinned ? 'Unpin Topic' : 'Pin Topic',
        icon:  topic.pinned ? 'pin' : 'pin-outline',
        iconBg: '#FEF3C7', iconColor: '#d97706',
      });
    }
    if (canDelete) {
      items.push({ key: 'trash',   label: 'Trash Topic',   icon: 'trash-outline',   iconBg: '#FEE2E2', iconColor: '#dc2626', danger: true });
      items.push({ key: 'restore', label: 'Restore Topic', icon: 'refresh-outline', iconBg: '#D1FAE5', iconColor: '#059669' });
    }
    if (canEdit || canModerate) {
      items.push({ key: 'history', label: 'Topic History', icon: 'time-outline', iconBg: '#F5F6F7', iconColor: '#5A5A5A' });
    }
    return items;
  }, [topic.locked, topic.pinned, canEdit, canModerate, canDelete]);

  function reset() {
    setActiveAction(null);
    setBusy(false);
    setError(null);
    setSuccess(null);
    setEditSubject('');
    setHistoryLogs([]);
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  function chooseAction(key: ActionKey) {
    setError(null);
    setSuccess(null);
    setActiveAction(key);
    if (key === 'edit')    setEditSubject(topic.title);
    if (key === 'history') loadHistory();
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryLogs([]);
    const logs = await getTopicActionHistory(topic.id);
    setHistoryLogs(logs);
    setHistoryLoading(false);
  }

  async function run<T extends { ok: boolean; error?: string }>(
    fn: () => Promise<T>,
    successMsg: string,
    action: ActionKey,
  ) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      setSuccess(successMsg);
      onActionComplete(action);
      setTimeout(() => { reset(); onClose(); }, 1100);
    } else {
      setError(res.error || 'Action failed.');
    }
  }

  function confirm() {
    if (!activeAction || busy) return;
    const topicId = topic.id;
    const forumId = topic.forumId;

    switch (activeAction) {
      case 'edit': {
        const subject = editSubject.trim();
        if (!subject) { setError('Topic title cannot be empty.'); return; }
        run(() => updateTopicSubject(topicId, subject), 'Topic updated.', 'edit');
        break;
      }
      case 'lock':
        run(
          () => topic.locked ? openTopic(topicId, forumId) : closeTopic(topicId, forumId),
          topic.locked ? 'Topic unlocked.' : 'Topic locked.',
          'lock',
        );
        break;
      case 'pin':
        run(
          () => updateTopicAdminSettings(topicId, { priority: topic.pinned ? 0 : 1 }),
          topic.pinned ? 'Topic unpinned.' : 'Topic pinned.',
          'pin',
        );
        break;
      case 'trash':
        run(() => trashTopic(topicId, forumId), 'Topic trashed.', 'trash');
        break;
      case 'restore':
        run(() => restoreTopic(topicId), 'Topic restored.', 'restore');
        break;
    }
  }

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const displayTitle = activeAction
    ? (menuItems.find(m => m.key === activeAction)?.label ?? 'Moderator Actions')
    : 'Moderator Actions';

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
              {activeAction ? (
                <Pressable
                  onPress={() => { setActiveAction(null); setError(null); setSuccess(null); }}
                  style={styles.iconBtn}
                  hitSlop={6}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.text} />
                </Pressable>
              ) : <View style={styles.iconBtn} />}
              <Text style={styles.title}>{displayTitle}</Text>
              <Pressable onPress={handleClose} style={styles.iconBtn} hitSlop={6}>
                <Ionicons name="close" size={16} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.banner}>
              <Text style={styles.bannerLabel}>Topic:</Text>
              <Text style={styles.bannerTitle} numberOfLines={1}>{topic.title}</Text>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {!activeAction && (
                <View style={styles.menu}>
                  {menuItems.map(item => (
                    <Pressable
                      key={item.key}
                      onPress={() => chooseAction(item.key)}
                      style={({ pressed }) => [
                        styles.menuItem,
                        pressed && styles.menuItemPressed,
                      ]}
                    >
                      <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                        <Ionicons name={item.icon} size={15} color={item.iconColor} />
                      </View>
                      <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                        {item.label}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
                    </Pressable>
                  ))}
                  {menuItems.length === 0 && (
                    <Text style={styles.emptyText}>No moderator actions available.</Text>
                  )}
                </View>
              )}

              {activeAction && (
                <View style={styles.form}>
                  {activeAction === 'edit' && (
                    <>
                      <Text style={styles.label}>Subject</Text>
                      <TextInput
                        value={editSubject}
                        onChangeText={setEditSubject}
                        placeholder="Topic title"
                        placeholderTextColor={colors.textTertiary}
                        maxLength={200}
                        editable={!busy}
                        style={styles.input}
                      />
                    </>
                  )}

                  {activeAction === 'lock' && (
                    <Text style={styles.confirmText}>
                      {topic.locked
                        ? 'Unlock this topic and allow new replies?'
                        : 'Lock this topic to prevent new replies?'}
                    </Text>
                  )}

                  {activeAction === 'pin' && (
                    <Text style={styles.confirmText}>
                      {topic.pinned
                        ? 'Unpin this topic so it no longer sits at the top?'
                        : 'Pin this topic to the top of the forum?'}
                    </Text>
                  )}

                  {activeAction === 'trash' && (
                    <Text style={styles.confirmText}>
                      Move this topic to the trash? Moderators can restore it later.
                    </Text>
                  )}

                  {activeAction === 'restore' && (
                    <Text style={styles.confirmText}>
                      Restore this topic from the trash back to its original forum?
                    </Text>
                  )}

                  {activeAction === 'history' && (
                    <View style={styles.historyList}>
                      {historyLoading && (
                        <View style={styles.historyState}>
                          <ActivityIndicator color={colors.primary} size="small" />
                          <Text style={styles.historyStateText}>Loading history…</Text>
                        </View>
                      )}
                      {!historyLoading && historyLogs.length === 0 && (
                        <Text style={styles.emptyText}>No history found for this topic.</Text>
                      )}
                      {historyLogs.map((log, i) => (
                        <View key={i} style={styles.historyItem}>
                          <Text style={styles.historyAction}>{log.actionText}</Text>
                          <Text style={styles.historyMeta}>
                            {log.userName}{log.createdWhen ? ' · ' + log.createdWhen : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {error && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={14} color={colors.danger} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                  {success && (
                    <View style={styles.successBox}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.successText}>{success}</Text>
                    </View>
                  )}

                  {activeAction !== 'history' && !success && (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => { setActiveAction(null); setError(null); }}
                        disabled={busy}
                        style={[styles.cancelBtn, busy && styles.btnDisabled]}
                      >
                        <Text style={styles.cancelBtnText}>Back</Text>
                      </Pressable>
                      <Pressable
                        onPress={confirm}
                        disabled={busy}
                        style={[
                          styles.confirmBtn,
                          activeAction === 'trash' && styles.confirmBtnDanger,
                          busy && styles.btnDisabled,
                        ]}
                      >
                        {busy ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.confirmBtnText}>Confirm</Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay:  { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheetWrap: { width: '100%', maxHeight: '90%' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
      paddingHorizontal: 14,
      paddingTop: 8,
      maxHeight: '100%',
    },
    dragHandle: {
      alignSelf: 'center', width: 44, height: 4, borderRadius: 3,
      backgroundColor: c.border, marginTop: 4, marginBottom: 10,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10,
    },
    iconBtn: {
      width: 30, height: 30, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center',
    },
    title: {
      fontSize: 14, fontWeight: '800', color: c.text, flex: 1, textAlign: 'center',
    },
    body: { flexGrow: 0 },
    bodyContent: { paddingBottom: 8 },
    banner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.surface, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10,
    },
    bannerLabel: { fontSize: 10, fontWeight: '800', color: c.textTertiary, textTransform: 'uppercase' },
    bannerTitle: { fontSize: 12, fontWeight: '700', color: c.text, flex: 1 },
    menu: { gap: 4 },
    menuItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 10, paddingVertical: 11, borderRadius: 10,
    },
    menuItemPressed: { backgroundColor: c.surface },
    menuIcon: {
      width: 32, height: 32, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    menuLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: c.text },
    menuLabelDanger: { color: c.danger },
    form: { paddingTop: 2 },
    label: {
      fontSize: 11, fontWeight: '700', color: c.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 6, marginBottom: 6,
    },
    input: {
      borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: c.text, backgroundColor: c.surface,
    },
    confirmText: {
      fontSize: 13, color: c.textSecondary, lineHeight: 18, paddingVertical: 8,
    },
    historyList: { gap: 6, paddingVertical: 4 },
    historyState: {
      flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10,
    },
    historyStateText: { fontSize: 12, color: c.textTertiary },
    historyItem: {
      paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: c.surface,
    },
    historyAction: { fontSize: 12, fontWeight: '700', color: c.text },
    historyMeta:   { fontSize: 11, color: c.textTertiary, marginTop: 2 },
    emptyText: {
      fontSize: 12, color: c.textTertiary, textAlign: 'center', paddingVertical: 12,
    },
    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#fef2f2', borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, marginTop: 10,
    },
    errorText: { color: c.danger, fontSize: 12, fontWeight: '600', flex: 1 },
    successBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#ecfdf5', borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, marginTop: 10,
    },
    successText: { color: '#059669', fontSize: 12, fontWeight: '600', flex: 1 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    cancelBtn: {
      flex: 1, paddingVertical: 12, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface,
    },
    cancelBtnText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    confirmBtn: {
      flex: 2, paddingVertical: 12, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary,
    },
    confirmBtnDanger: { backgroundColor: c.danger },
    confirmBtnText:   { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    btnDisabled:      { opacity: 0.6 },
  });
}
