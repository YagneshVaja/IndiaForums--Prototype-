import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { extractApiError } from '../../../services/api';
import { hapticError, hapticSuccess } from '../../../utils/haptics';
import { stripHtml } from '../../profile/utils/format';
import { updateActivity } from '../services/activitiesApi';
import { buildActivityHtml } from '../utils/composeHtml';
import type { ActivityDto } from '../../profile/types';

interface Props {
  visible: boolean;
  activity: ActivityDto | null;
  onClose: () => void;
}

const MAX_LEN = 1000;

export default function EditActivitySheet({ visible, activity, onClose }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();

  const [text, setText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Re-prime the form whenever a different activity opens. Strip the stored
  // HTML to plain text so the user edits prose, not markup — we'll re-wrap on
  // save. Existing inline images are preserved by saving back full HTML only
  // when the text actually changed; the simpler path is: editing text
  // overwrites content, and image preservation is a deferred enhancement.
  useEffect(() => {
    if (visible && activity) {
      setText(stripHtml(activity.content || activity.subject || ''));
      setLinkUrl(activity.linkUrl ?? '');
    }
  }, [visible, activity]);

  const save = useMutation({
    mutationFn: () => {
      if (!activity) throw new Error('No activity to edit');
      const html = buildActivityHtml(text, []);
      return updateActivity(activity.activityId, {
        activityId: activity.activityId,
        content: html,
        linkUrl: linkUrl.trim() || null,
      });
    },
    onSuccess: (res) => {
      if (!res.isSuccess) {
        hapticError();
        Alert.alert('Error', res.message || 'Failed to update.');
        return;
      }
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['profile-tab', 'activity'] });
      onClose();
    },
    onError: (err) => {
      hapticError();
      Alert.alert('Error', extractApiError(err, 'Failed to update.'));
    },
  });

  const trimmed = text.trim();
  const canSave = trimmed.length > 0 && !save.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <Text style={styles.title}>Edit post</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={MAX_LEN}
            editable={!save.isPending}
            style={styles.input}
            autoFocus
          />
          <Text style={styles.counter}>{text.length}/{MAX_LEN}</Text>

          <TextInput
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder="Insert valid URL (optional)"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!save.isPending}
            style={styles.linkInput}
          />

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              disabled={save.isPending}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => save.mutate()}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && canSave && styles.pressed,
                !canSave && { opacity: 0.6 },
              ]}
            >
              {save.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.scrim,
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
      paddingHorizontal: 16,
      paddingBottom: 28,
      gap: 10,
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
    input: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      minHeight: 110,
      textAlignVertical: 'top',
    },
    counter: {
      fontSize: 11,
      color: c.textTertiary,
      textAlign: 'right',
    },
    linkInput: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: c.text,
    },
    footer: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
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
    primaryBtn: {
      flex: 2,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    pressed: { opacity: 0.88 },
  });
}
