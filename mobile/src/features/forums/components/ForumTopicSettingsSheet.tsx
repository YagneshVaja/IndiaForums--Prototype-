import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  closeTopic, openTopic, moveTopic, mergeTopic, trashTopic, restoreTopic,
  updateTopicSubject, updateTopicAdminSettings, getTopicActionHistory,
  type Forum, type ForumTopic, type TopicActionLog,
} from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  visible: boolean;
  forum: Forum;
  topics: ForumTopic[];
  onClose: () => void;
  onActionComplete: () => void;
}

type ActionKey =
  | 'edit' | 'migrateFF' | 'move' | 'merge' | 'lock' | 'pin'
  | 'trash' | 'restore' | 'history' | 'hideSignature' | 'team';

const NEEDS_TOPIC: ActionKey[] = ['edit', 'migrateFF', 'move', 'merge', 'lock', 'pin', 'trash', 'restore', 'history'];

interface MenuItem {
  key: ActionKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  danger?: boolean;
}

export default function ForumTopicSettingsSheet({
  visible, forum, topics, onClose, onActionComplete,
}: Props) {
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [activeAction, setActiveAction]   = useState<ActionKey | null>(null);
  const [picking, setPicking]             = useState(false);
  const [busy, setBusy]                   = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState<string | null>(null);

  const [targetForumId, setTargetForumId] = useState('');
  const [targetTopicId, setTargetTopicId] = useState('');
  const [editSubject, setEditSubject]     = useState('');
  const [hideSig, setHideSig]             = useState(false);
  const [historyLogs, setHistoryLogs]     = useState<TopicActionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];
    if (forum.editPosts > 0) {
      items.push({ key: 'edit', label: 'Edit Topic', icon: 'create-outline', iconBg: '#E8EEFF', iconColor: '#3558F0' });
    }
    if (forum.priorityPosts > 0) {
      items.push({ key: 'migrateFF', label: 'Migrate FF', icon: 'arrow-redo-outline', iconBg: '#E8EEFF', iconColor: '#3558F0' });
      items.push({ key: 'move',      label: 'Move Topic', icon: 'folder-outline',    iconBg: '#FEF3C7', iconColor: '#d97706' });
      items.push({ key: 'merge',     label: 'Merge Topic', icon: 'git-merge-outline', iconBg: '#D1FAE5', iconColor: '#059669' });
      const isLocked = selectedTopic?.locked ?? false;
      items.push({
        key: 'lock',
        label: isLocked ? 'Unlock Topic' : 'Lock Topic',
        icon: isLocked ? 'lock-open-outline' : 'lock-closed-outline',
        iconBg: '#FEF3C7', iconColor: '#d97706',
      });
      const isPinned = selectedTopic?.pinned ?? false;
      items.push({
        key: 'pin',
        label: isPinned ? 'Unpin Topic' : 'Pin Topic',
        icon: 'bookmark-outline',
        iconBg: '#FEF3C7', iconColor: '#d97706',
      });
    }
    if (forum.deletePosts > 0) {
      items.push({ key: 'trash',   label: 'Trash Topic',   icon: 'trash-outline',   iconBg: '#FEE2E2', iconColor: '#dc2626', danger: true });
      items.push({ key: 'restore', label: 'Restore Topic', icon: 'refresh-outline', iconBg: '#D1FAE5', iconColor: '#059669' });
    }
    if (forum.priorityPosts > 0 || forum.editPosts > 0) {
      items.push({ key: 'history', label: 'Topic History', icon: 'time-outline', iconBg: '#F5F6F7', iconColor: '#5A5A5A' });
    }
    items.push({ key: 'hideSignature', label: 'Hide Signature', icon: 'eye-off-outline', iconBg: '#F5F6F7', iconColor: '#5A5A5A' });
    items.push({ key: 'team',          label: 'Team',           icon: 'people-outline',  iconBg: '#D1FAE5', iconColor: '#059669' });
    return items;
  }, [forum, selectedTopic]);

  function reset() {
    setSelectedTopic(null);
    setActiveAction(null);
    setPicking(false);
    setBusy(false);
    setError(null);
    setSuccess(null);
    setTargetForumId('');
    setTargetTopicId('');
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
    if (NEEDS_TOPIC.includes(key) && !selectedTopic) {
      setActiveAction(key);
      setPicking(true);
      return;
    }
    enterAction(key, selectedTopic);
  }

  function pickTopic(topic: ForumTopic) {
    setSelectedTopic(topic);
    setPicking(false);
    if (activeAction) enterAction(activeAction, topic);
  }

  function enterAction(key: ActionKey, topic: ForumTopic | null) {
    setActiveAction(key);
    if (key === 'edit' && topic) setEditSubject(topic.title);
    if (key === 'history' && topic) loadHistory(topic.id);
  }

  async function loadHistory(topicId: number) {
    setHistoryLoading(true);
    setHistoryLogs([]);
    const logs = await getTopicActionHistory(topicId);
    setHistoryLogs(logs);
    setHistoryLoading(false);
  }

  async function run<T extends { ok: boolean; error?: string }>(
    fn: () => Promise<T>,
    successMsg: string,
  ) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      setSuccess(successMsg);
      onActionComplete();
      setTimeout(() => { reset(); onClose(); }, 1100);
    } else {
      setError(res.error || 'Action failed.');
    }
  }

  function confirm() {
    if (!activeAction || busy || !selectedTopic) return;
    const topicId = selectedTopic.id;
    const forumId = selectedTopic.forumId || forum.id;

    switch (activeAction) {
      case 'edit': {
        const subject = editSubject.trim();
        if (!subject) { setError('Topic title cannot be empty.'); return; }
        run(() => updateTopicSubject(topicId, subject), 'Topic updated.');
        break;
      }
      case 'migrateFF':
      case 'move': {
        const toId = Number(targetForumId);
        if (!toId) { setError('Enter a valid target forum ID.'); return; }
        run(() => moveTopic(topicId, toId),
          activeAction === 'migrateFF' ? 'Topic migrated.' : 'Topic moved.');
        break;
      }
      case 'merge': {
        const intoId = Number(targetTopicId);
        if (!intoId) { setError('Enter a valid target topic ID.'); return; }
        run(() => mergeTopic(topicId, intoId), 'Topic merged.');
        break;
      }
      case 'lock': {
        const locked = selectedTopic.locked;
        run(
          () => locked ? openTopic(topicId, forumId) : closeTopic(topicId, forumId),
          locked ? 'Topic unlocked.' : 'Topic locked.',
        );
        break;
      }
      case 'pin': {
        const isPinned = selectedTopic.pinned;
        run(
          () => updateTopicAdminSettings(topicId, { priority: isPinned ? 0 : 1 }),
          isPinned ? 'Topic unpinned.' : 'Topic pinned.',
        );
        break;
      }
      case 'trash':
        run(() => trashTopic(topicId, forumId), 'Topic trashed.');
        break;
      case 'restore':
        run(() => restoreTopic(topicId), 'Topic restored.');
        break;
    }
  }

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const isPickingTopic = picking;
  const displayTitle = isPickingTopic
    ? 'Select Topic'
    : (activeAction
      ? (menuItems.find(m => m.key === activeAction)?.label ?? 'Topic Settings')
      : 'Topic Settings');

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
              {activeAction && !isPickingTopic ? (
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

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {isPickingTopic && (
                <View>
                  <Text style={styles.pickerHint}>Choose a topic to apply this action to:</Text>
                  <View style={styles.pickerList}>
                    {topics.map(t => (
                      <Pressable
                        key={t.id}
                        onPress={() => pickTopic(t)}
                        style={styles.pickerItem}
                      >
                        {t.locked && <Ionicons name="lock-closed" size={11} color={colors.danger} />}
                        <Text style={styles.pickerTitle} numberOfLines={1}>{t.title}</Text>
                        <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
                      </Pressable>
                    ))}
                    {topics.length === 0 && (
                      <Text style={styles.emptyText}>No topics available.</Text>
                    )}
                  </View>
                </View>
              )}

              {!activeAction && !isPickingTopic && (
                <View>
                  {selectedTopic && (
                    <View style={styles.banner}>
                      <Text style={styles.bannerLabel}>Topic:</Text>
                      <Text style={styles.bannerTitle} numberOfLines={1}>{selectedTopic.title}</Text>
                      <Pressable onPress={() => setSelectedTopic(null)} hitSlop={6}>
                        <Ionicons name="close-circle" size={14} color={colors.textTertiary} />
                      </Pressable>
                    </View>
                  )}
                  <View style={styles.menu}>
                    {menuItems.map(item => (
                      <Pressable
                        key={item.key}
                        onPress={() => chooseAction(item.key)}
                        style={({ pressed }) => [
                          styles.menuItem,
                          pressed && styles.menuItemPressed,
                          item.danger && styles.menuItemDanger,
                        ]}
                      >
                        <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                          <Ionicons name={item.icon} size={15} color={item.iconColor} />
                        </View>
                        <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                          {item.label}
                        </Text>
                        {NEEDS_TOPIC.includes(item.key) && !selectedTopic && (
                          <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {activeAction && !isPickingTopic && (
                <View style={styles.form}>
                  {selectedTopic && NEEDS_TOPIC.includes(activeAction) && (
                    <View style={styles.banner}>
                      <Text style={styles.bannerLabel}>Topic:</Text>
                      <Text style={styles.bannerTitle} numberOfLines={1}>{selectedTopic.title}</Text>
                    </View>
                  )}

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

                  {(activeAction === 'migrateFF' || activeAction === 'move') && (
                    <>
                      <Text style={styles.label}>Target Forum ID</Text>
                      <TextInput
                        value={targetForumId}
                        onChangeText={setTargetForumId}
                        keyboardType="number-pad"
                        placeholder="e.g. 42"
                        placeholderTextColor={colors.textTertiary}
                        editable={!busy}
                        style={styles.input}
                      />
                    </>
                  )}

                  {activeAction === 'merge' && (
                    <>
                      <Text style={styles.label}>Target Topic ID (merge into)</Text>
                      <TextInput
                        value={targetTopicId}
                        onChangeText={setTargetTopicId}
                        keyboardType="number-pad"
                        placeholder="e.g. 12345"
                        placeholderTextColor={colors.textTertiary}
                        editable={!busy}
                        style={styles.input}
                      />
                    </>
                  )}

                  {activeAction === 'lock' && (
                    <Text style={styles.confirmText}>
                      {selectedTopic?.locked
                        ? 'Unlock this topic and allow new replies?'
                        : 'Lock this topic to prevent new replies?'}
                    </Text>
                  )}

                  {activeAction === 'trash' && (
                    <Text style={styles.confirmText}>
                      Move this topic to the trash? Moderators can restore it later.
                    </Text>
                  )}

                  {activeAction === 'pin' && (
                    <Text style={styles.confirmText}>
                      {selectedTopic?.pinned
                        ? 'Unpin this topic so it no longer sits at the top?'
                        : 'Pin this topic to the top of the forum?'}
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

                  {activeAction === 'hideSignature' && (
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>
                        Hide member signatures in this topic
                      </Text>
                      <Switch
                        value={hideSig}
                        onValueChange={setHideSig}
                        thumbColor="#FFFFFF"
                        trackColor={{ false: '#D1D5DB', true: colors.primary }}
                      />
                    </View>
                  )}

                  {activeAction === 'team' && (
                    <Text style={styles.emptyText}>No team members found.</Text>
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

                  {!['history', 'team'].includes(activeAction) && !success && (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => { setActiveAction(null); setError(null); }}
                        disabled={busy}
                        style={[styles.cancelBtn, busy && styles.btnDisabled]}
                      >
                        <Text style={styles.cancelBtnText}>Back</Text>
                      </Pressable>
                      {activeAction === 'hideSignature' ? (
                        <Pressable
                          onPress={() => {
                            setSuccess('Preference saved.');
                            setTimeout(() => { setActiveAction(null); setSuccess(null); }, 1100);
                          }}
                          disabled={busy}
                          style={[styles.confirmBtn, busy && styles.btnDisabled]}
                        >
                          <Text style={styles.confirmBtnText}>Save</Text>
                        </Pressable>
                      ) : (
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
                      )}
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
    overlay: { flex: 1, justifyContent: 'flex-end' },
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
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      flex: 1,
      textAlign: 'center',
    },
    body: { flexGrow: 0 },
    bodyContent: { paddingBottom: 8 },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
    },
    bannerLabel: { fontSize: 10, fontWeight: '800', color: c.textTertiary, textTransform: 'uppercase' },
    bannerTitle: { fontSize: 12, fontWeight: '700', color: c.text, flex: 1 },
    menu: { gap: 4 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 10,
      paddingVertical: 11,
      borderRadius: 10,
    },
    menuItemPressed: { backgroundColor: c.surface },
    menuItemDanger: {},
    menuIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    menuLabelDanger: { color: c.danger },
    form: { paddingTop: 4 },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginTop: 6,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.surface,
    },
    confirmText: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
      paddingVertical: 8,
    },
    pickerHint: {
      fontSize: 12,
      color: c.textTertiary,
      marginBottom: 8,
    },
    pickerList: {
      gap: 4,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    pickerTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
      flex: 1,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 8,
    },
    toggleLabel: {
      fontSize: 13,
      color: c.text,
      flex: 1,
    },
    historyList: {
      gap: 6,
      paddingVertical: 4,
    },
    historyState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
    },
    historyStateText: {
      fontSize: 12,
      color: c.textTertiary,
    },
    historyItem: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: c.surface,
    },
    historyAction: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
    },
    historyMeta: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 2,
    },
    emptyText: {
      fontSize: 12,
      color: c.textTertiary,
      textAlign: 'center',
      paddingVertical: 12,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.dangerSoft,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 10,
    },
    errorText: { color: c.danger, fontSize: 12, fontWeight: '600', flex: 1 },
    successBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.successSoft,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 10,
    },
    successText: { color: c.success, fontSize: 12, fontWeight: '600', flex: 1 },
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
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
    confirmBtn: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    confirmBtnDanger: { backgroundColor: c.danger },
    confirmBtnText: { color: c.onPrimary, fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.6 },
  });
}
