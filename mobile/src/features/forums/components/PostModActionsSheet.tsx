import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  editPost, trashPost, reportContent, getReportTypes,
  REPORT_CONTENT_TYPE_FORUM,
  type TopicPost, type ReportTypeEntry,
} from '../../../services/api';
import { stripPostHtml } from '../utils/stripHtml';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export type PostActionKey =
  | 'report' | 'edit' | 'history'
  | 'trash'  | 'move' | 'matured' | 'modNote';

interface Props {
  visible:     boolean;
  post:        TopicPost | null;
  topicId:     number;
  forumId:     number;
  isOwner:     boolean;
  isModerator: boolean;
  onClose:     () => void;
  onEdit:         (post: TopicPost) => void;
  onShowHistory:  (post: TopicPost) => void;
  onActionComplete: (action: PostActionKey) => void;
}

interface MenuItem {
  key:       PostActionKey;
  label:     string;
  icon:      keyof typeof Ionicons.glyphMap;
  iconBg:    string;
  iconColor: string;
  danger?:   boolean;
}

export default function PostModActionsSheet({
  visible, post, topicId, forumId, isOwner, isModerator,
  onClose, onEdit, onShowHistory, onActionComplete,
}: Props) {
  const [activeAction, setActiveAction] = useState<PostActionKey | null>(null);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [reasons,     setReasons]     = useState<ReportTypeEntry[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [reason,      setReason]      = useState<string>('');
  const [remark,      setRemark]      = useState<string>('');
  const [note,        setNote]        = useState<string>('');
  const [moveTarget,  setMoveTarget]  = useState<string>('');

  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const menuItems: MenuItem[] = useMemo(() => {
    if (!post) return [];
    const items: MenuItem[] = [];

    items.push({ key: 'report',  label: 'Report',  icon: 'flag-outline',
      iconBg: '#FEF3C7', iconColor: '#d97706' });

    if (isOwner || isModerator) {
      items.push({ key: 'edit', label: 'Edit', icon: 'create-outline',
        iconBg: '#E8EEFF', iconColor: '#3558F0' });
    }
    if (post.isEdited || isOwner || isModerator) {
      items.push({ key: 'history', label: 'History', icon: 'time-outline',
        iconBg: '#F5F6F7', iconColor: '#5A5A5A' });
    }

    if (isModerator) {
      items.push({ key: 'trash',   label: 'Trash Post',  icon: 'trash-outline',
        iconBg: '#FEE2E2', iconColor: '#dc2626', danger: true });
      items.push({ key: 'move',    label: 'Move Post',   icon: 'git-branch-outline',
        iconBg: '#E0F2FE', iconColor: '#0284c7' });
      items.push({
        key:   'matured',
        label: post.hasMaturedContent ? 'Unmark Matured Post' : 'Mark As Matured Post',
        icon:  'warning-outline',
        iconBg: '#FEF3C7', iconColor: '#d97706',
      });
      items.push({ key: 'modNote', label: 'Add Moderator Note', icon: 'document-text-outline',
        iconBg: '#EDE9FE', iconColor: '#7c3aed' });
    }
    return items;
  }, [post, isOwner, isModerator]);

  function reset() {
    setActiveAction(null);
    setBusy(false);
    setError(null);
    setSuccess(null);
    setReason('');
    setRemark('');
    setNote('');
    setMoveTarget('');
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  function chooseAction(key: PostActionKey) {
    if (!post) return;
    setError(null);
    setSuccess(null);

    // Delegated actions: close the sheet, parent handles the rest.
    if (key === 'edit')    { onEdit(post);        reset(); onClose(); return; }
    if (key === 'history') { onShowHistory(post); reset(); onClose(); return; }

    setActiveAction(key);
    if (key === 'report')  loadReasons();
    if (key === 'modNote') setNote(post.moderatorNote || '');
  }

  async function loadReasons() {
    setLoadingReasons(true);
    const list = await getReportTypes();
    setReasons(list);
    setLoadingReasons(false);
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>,
                    successMsg: string, action: PostActionKey) {
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
    if (!activeAction || !post || busy) return;

    switch (activeAction) {
      case 'report': {
        if (!reason) { setError('Pick a reason.'); return; }
        run(
          () => reportContent({
            contentType: REPORT_CONTENT_TYPE_FORUM,
            contentId:   post.id,
            reason,
            remark:      remark.trim() || undefined,
            forumId,
            topicId,
          }),
          'Report submitted. Thank you.',
          'report',
        );
        break;
      }
      case 'trash':
        run(() => trashPost({ threadId: post.id, topicId }), 'Post trashed.', 'trash');
        break;
      case 'matured':
        run(
          () => editPost({
            postId:            post.id,
            topicId,
            message:           stripPostHtml(post.message),
            hasMaturedContent: !post.hasMaturedContent,
            moderatorNote:     post.moderatorNote || undefined,
          }),
          post.hasMaturedContent ? 'Unmarked as matured.' : 'Marked as matured.',
          'matured',
        );
        break;
      case 'modNote': {
        if (!note.trim()) { setError('Note cannot be empty.'); return; }
        run(
          () => editPost({
            postId:            post.id,
            topicId,
            message:           stripPostHtml(post.message),
            hasMaturedContent: post.hasMaturedContent,
            moderatorNote:     note.trim(),
          }),
          'Moderator note saved.',
          'modNote',
        );
        break;
      }
      case 'move':
        // No per-post move endpoint exposed by the public API yet.
        setError('Move post is not available via the public API yet.');
        break;
    }
  }

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  if (!post) return null;

  const displayTitle = activeAction
    ? (menuItems.find(m => m.key === activeAction)?.label ?? 'Post Actions')
    : 'Post Actions';

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
              <Text style={styles.bannerLabel}>By:</Text>
              <Text style={styles.bannerTitle} numberOfLines={1}>{post.author}</Text>
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
                  {isModerator && (
                    <View style={styles.ipRow}>
                      <View style={[styles.menuIcon, { backgroundColor: colors.surface }]}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      </View>
                      <Text style={styles.ipLabel}>IP</Text>
                      <Text style={styles.ipValue}>{post.ip || '—'}</Text>
                    </View>
                  )}
                </View>
              )}

              {activeAction && (
                <View style={styles.form}>
                  {activeAction === 'report' && (
                    <>
                      <Text style={styles.label}>Reason</Text>
                      {loadingReasons ? (
                        <View style={styles.loadingRow}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={styles.loadingText}>Loading reasons…</Text>
                        </View>
                      ) : (
                        <View style={styles.reasonList}>
                          {reasons.map((r) => (
                            <Pressable
                              key={r.reason}
                              onPress={() => setReason(r.reason)}
                              style={[
                                styles.reasonPill,
                                reason === r.reason && styles.reasonPillOn,
                              ]}
                            >
                              <Text style={[
                                styles.reasonPillText,
                                reason === r.reason && styles.reasonPillTextOn,
                              ]}>
                                {r.reason}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      <Text style={styles.label}>Remark (optional)</Text>
                      <TextInput
                        value={remark}
                        onChangeText={setRemark}
                        placeholder="Add any extra context for the moderators…"
                        placeholderTextColor={colors.textTertiary}
                        editable={!busy}
                        multiline
                        style={[styles.input, styles.inputMulti]}
                      />
                    </>
                  )}

                  {activeAction === 'trash' && (
                    <Text style={styles.confirmText}>
                      Move this post to the trash? Moderators can restore it later.
                    </Text>
                  )}

                  {activeAction === 'matured' && (
                    <Text style={styles.confirmText}>
                      {post.hasMaturedContent
                        ? 'Unmark this post so it is no longer flagged as mature content?'
                        : 'Mark this post as mature content? It will be gated on the main feed.'}
                    </Text>
                  )}

                  {activeAction === 'move' && (
                    <>
                      <Text style={styles.hint}>
                        Per-post move is not exposed by the public API. Splitting/moving
                        posts happens topic-side on the live site and is not wired here.
                      </Text>
                      <Text style={styles.label}>Destination topic ID</Text>
                      <TextInput
                        value={moveTarget}
                        onChangeText={setMoveTarget}
                        keyboardType="numeric"
                        placeholder="e.g. 12345"
                        placeholderTextColor={colors.textTertiary}
                        editable={!busy}
                        style={styles.input}
                      />
                    </>
                  )}

                  {activeAction === 'modNote' && (
                    <>
                      <Text style={styles.label}>Note</Text>
                      <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="Internal note visible to moderators only…"
                        placeholderTextColor={colors.textTertiary}
                        editable={!busy}
                        multiline
                        style={[styles.input, styles.inputMulti]}
                      />
                    </>
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

                  {!success && (
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
                          <Text style={styles.confirmBtnText}>
                            {activeAction === 'report' ? 'Submit Report'
                              : activeAction === 'modNote' ? 'Save Note'
                              : activeAction === 'move'    ? 'Move'
                              : 'Confirm'}
                          </Text>
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
    ipRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 10, paddingVertical: 11, marginTop: 6,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
    },
    ipLabel: { fontSize: 11, fontWeight: '800', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    ipValue: { flex: 1, fontSize: 12, fontWeight: '700', color: c.textSecondary, textAlign: 'right', fontVariant: ['tabular-nums'] },
    form: { paddingTop: 2 },
    label: {
      fontSize: 11, fontWeight: '700', color: c.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 6, marginBottom: 6,
    },
    hint: {
      fontSize: 12, color: c.textSecondary, lineHeight: 18,
      backgroundColor: c.surface, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, marginTop: 4,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    loadingText: { fontSize: 12, color: c.textTertiary },
    input: {
      borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: c.text, backgroundColor: c.surface,
    },
    inputMulti: { minHeight: 80, textAlignVertical: 'top' },
    reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    reasonPill: {
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
    },
    reasonPillOn: { backgroundColor: c.primary, borderColor: c.primary },
    reasonPillText: { fontSize: 11.5, fontWeight: '700', color: c.textSecondary },
    reasonPillTextOn: { color: c.onPrimary },
    confirmText: {
      fontSize: 13, color: c.textSecondary, lineHeight: 18, paddingVertical: 8,
    },
    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.dangerSoft, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, marginTop: 10,
    },
    errorText: { color: c.danger, fontSize: 12, fontWeight: '600', flex: 1 },
    successBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.successSoft, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 8, marginTop: 10,
    },
    successText: { color: c.success, fontSize: 12, fontWeight: '600', flex: 1 },
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
    confirmBtnText:   { color: c.onPrimary, fontSize: 13, fontWeight: '800' },
    btnDisabled:      { opacity: 0.6 },
  });
}
