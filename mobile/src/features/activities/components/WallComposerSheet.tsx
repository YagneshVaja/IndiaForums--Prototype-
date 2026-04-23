import React, { useMemo, useState } from 'react';
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
import { postOnWall } from '../services/activitiesApi';

type FeedKind = 'testimonial' | 'slambook' | 'scrapbook';

// API feedTypeId mapping (from FEED_META used across screens)
const FEED_TYPE_ID: Record<FeedKind, number> = {
  testimonial: 16,
  slambook: 17,
  scrapbook: 18,
};

const OPTIONS: { kind: FeedKind; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; hint: string }[] = [
  { kind: 'scrapbook', label: 'Scrapbook', icon: 'book-outline', color: '#B26A00', hint: 'Leave a friendly note' },
  { kind: 'testimonial', label: 'Testimonial', icon: 'ribbon-outline', color: '#16A96B', hint: 'Vouch for this user' },
  { kind: 'slambook', label: 'Slambook', icon: 'heart-outline', color: '#7C5CE9', hint: 'Share a memory' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  wallUserId: number | string;
  wallUserName: string;
}

export default function WallComposerSheet({ visible, onClose, wallUserId, wallUserName }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();

  const [kind, setKind] = useState<FeedKind>('scrapbook');
  const [content, setContent] = useState('');

  const post = useMutation({
    mutationFn: () =>
      postOnWall({
        wallUserId,
        feedTypeId: FEED_TYPE_ID[kind],
        content: content.trim(),
      }),
    onSuccess: (res) => {
      if (!res.isSuccess) {
        Alert.alert('Error', res.message || 'Failed to post.');
        return;
      }
      qc.invalidateQueries({ queryKey: ['profile-tab', 'activity'] });
      qc.invalidateQueries({ queryKey: ['profile', 'user', String(wallUserId)] });
      setContent('');
      onClose();
    },
    onError: (err) => Alert.alert('Error', extractApiError(err, 'Failed to post.')),
  });

  const submit = () => {
    if (!content.trim()) return Alert.alert('Error', 'Please write something.');
    post.mutate();
  };

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
            <Text style={styles.title}>Write on {wallUserName}'s wall</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>Pick a type, then write your message.</Text>

          <View style={styles.options}>
            {OPTIONS.map((opt) => {
              const active = kind === opt.kind;
              return (
                <Pressable
                  key={opt.kind}
                  onPress={() => setKind(opt.kind)}
                  style={[styles.option, active && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
                >
                  <Ionicons name={opt.icon} size={18} color={opt.color} />
                  <Text style={[styles.optionLabel, active && { color: opt.color }]}>{opt.label}</Text>
                  <Text style={styles.optionHint}>{opt.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Write a note..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={5}
            maxLength={500}
            editable={!post.isPending}
            style={styles.input}
          />
          <Text style={styles.counter}>{content.length}/500</Text>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              disabled={post.isPending}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={post.isPending || !content.trim()}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
                (post.isPending || !content.trim()) && { opacity: 0.6 },
              ]}
            >
              {post.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Post</Text>
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
      gap: 12,
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
    },
    options: {
      flexDirection: 'row',
      gap: 8,
    },
    option: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: 4,
      alignItems: 'center',
    },
    optionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: c.text,
    },
    optionHint: {
      fontSize: 10,
      color: c.textTertiary,
      textAlign: 'center',
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
      minHeight: 96,
      textAlignVertical: 'top',
    },
    counter: {
      fontSize: 11,
      color: c.textTertiary,
      textAlign: 'right',
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
