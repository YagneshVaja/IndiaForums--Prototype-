import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../profile/components/EmptyState';
import { extractApiError } from '../../../services/api';
import { stripHtml, timeAgo } from '../../profile/utils/format';

import {
  createActivity,
  deleteActivity,
  getMyActivities,
  updateActivity,
} from '../services/activitiesApi';
import type { ActivityDto } from '../../profile/types';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'MyActivities'>;

// Feed type codes mirror the web prototype
const FEED_META: Record<number, { label: string; accent: string }> = {
  38: { label: 'Update', accent: '#3558F0' },
  16: { label: 'Testimonial', accent: '#16A96B' },
  17: { label: 'Slambook', accent: '#7C5CE9' },
  18: { label: 'Scrapbook', accent: '#B26A00' },
};

export default function MyActivitiesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useThemedStyles(makeStyles);
  const authUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [composeText, setComposeText] = useState('');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [postingError, setPostingError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['my-activities'],
    queryFn: () => getMyActivities({ mode: '3', pageSize: 30 }),
    enabled: !!authUser,
    staleTime: 30_000,
  });

  const items = list.data?.activities ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-activities'] });

  const post = useMutation({
    mutationFn: (content: string) =>
      createActivity({
        wallUserId: authUser!.userId,
        content,
        subject: null,
      }),
    onSuccess: (res) => {
      if (!res.isSuccess) {
        setPostingError(res.message || 'Failed to post activity.');
        return;
      }
      setComposeText('');
      invalidate();
    },
    onError: (err) => setPostingError(extractApiError(err, 'Failed to post activity.')),
  });

  const edit = useMutation({
    mutationFn: (args: { activityId: number | string; content: string }) =>
      updateActivity(args.activityId, { activityId: args.activityId, content: args.content }),
    onSuccess: (res, args) => {
      if (!res.isSuccess) {
        Alert.alert('Error', res.message || 'Failed to update activity.');
        return;
      }
      setEditingId(null);
      setEditingText('');
      invalidate();
      void args;
    },
    onError: (err) => Alert.alert('Error', extractApiError(err, 'Failed to update activity.')),
  });

  const remove = useMutation({
    mutationFn: (activityId: number | string) => deleteActivity(activityId),
    onSuccess: (res) => {
      if (!res.isSuccess) {
        Alert.alert('Error', res.message || 'Failed to delete activity.');
        return;
      }
      invalidate();
    },
    onError: (err) => Alert.alert('Error', extractApiError(err, 'Failed to delete activity.')),
  });

  const confirmDelete = (activityId: number | string) => {
    Alert.alert('Delete this activity?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(activityId) },
    ]);
  };

  const startEdit = (a: ActivityDto) => {
    setEditingId(a.activityId);
    setEditingText(stripHtml(a.content || a.subject));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = (a: ActivityDto) => {
    const text = editingText.trim();
    if (!text) return Alert.alert('Error', 'Activity cannot be empty.');
    edit.mutate({ activityId: a.activityId, content: text });
  };

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="My Activity" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={list.refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Composer */}
        <View style={styles.composer}>
          <Text style={styles.composerLabel}>Post an update</Text>
          <TextInput
            value={composeText}
            onChangeText={(v) => {
              setComposeText(v);
              if (postingError) setPostingError(null);
            }}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            maxLength={500}
            editable={!post.isPending}
            style={styles.composerInput}
          />
          <View style={styles.composerFooter}>
            <Text style={styles.counter}>{composeText.length}/500</Text>
            <Pressable
              onPress={() => composeText.trim() && post.mutate(composeText.trim())}
              disabled={!composeText.trim() || post.isPending}
              style={({ pressed }) => [
                styles.postBtn,
                pressed && styles.pressed,
                (!composeText.trim() || post.isPending) && styles.postBtnDisabled,
              ]}
            >
              {post.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={14} color="#FFF" />
                  <Text style={styles.postBtnText}>Post</Text>
                </>
              )}
            </Pressable>
          </View>
          {postingError ? <Text style={styles.err}>{postingError}</Text> : null}
        </View>

        {/* Feed */}
        {list.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : list.isError ? (
          <ErrorState message={extractApiError(list.error)} onRetry={list.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="pulse-outline"
            title="No activity yet"
            subtitle="Your updates, testimonials, and wall posts will appear here."
          />
        ) : (
          <View style={styles.list}>
            {items.map((a) => (
              <ActivityCard
                key={String(a.activityId)}
                a={a}
                canEdit={String(a.userId) === String(authUser?.userId)}
                isEditing={String(editingId) === String(a.activityId)}
                editingText={editingText}
                onEditingTextChange={setEditingText}
                onStartEdit={() => startEdit(a)}
                onSaveEdit={() => saveEdit(a)}
                onCancelEdit={cancelEdit}
                onDelete={() => confirmDelete(a.activityId)}
                busy={
                  (edit.isPending && String(edit.variables?.activityId) === String(a.activityId)) ||
                  (remove.isPending && String(remove.variables) === String(a.activityId))
                }
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Activity card ───────────────────────────────────────────────────────────

interface CardProps {
  a: ActivityDto;
  canEdit: boolean;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (s: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  busy: boolean;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

const ActivityCard = React.memo(function ActivityCard({
  a,
  canEdit,
  isEditing,
  editingText,
  onEditingTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  busy,
  styles,
  colors,
}: CardProps) {
  const feedId = typeof a.feedTypeId === 'string' ? parseInt(a.feedTypeId, 10) : a.feedTypeId;
  const meta = FEED_META[feedId] || { label: 'Activity', accent: colors.textSecondary };
  const body = stripHtml(a.content || a.subject);

  return (
    <View style={[styles.card, { borderLeftColor: meta.accent }]}>
      <View style={styles.cardHead}>
        <View style={[styles.pill, { backgroundColor: meta.accent + '22' }]}>
          <Text style={[styles.pillText, { color: meta.accent }]}>{meta.label}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(a.publishedWhen)}</Text>
      </View>

      {isEditing ? (
        <>
          <TextInput
            value={editingText}
            onChangeText={onEditingTextChange}
            multiline
            numberOfLines={4}
            maxLength={500}
            editable={!busy}
            style={styles.editInput}
          />
          <View style={styles.editActions}>
            <Pressable
              onPress={onCancelEdit}
              disabled={busy}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSaveEdit}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtnSm,
                pressed && styles.pressed,
                busy && styles.postBtnDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnSmText}>Save</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {a.subject ? (
            <Text style={styles.subject} numberOfLines={2}>
              {stripHtml(a.subject)}
            </Text>
          ) : null}
          {body ? (
            <Text style={styles.body} numberOfLines={6}>
              {body}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              ♥ {String(a.likeCount)} · 💬 {String(a.commentCount)}
            </Text>
            {canEdit ? (
              <View style={styles.rowActions}>
                <Pressable
                  onPress={onStartEdit}
                  hitSlop={8}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={onDelete}
                  hitSlop={8}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
});

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    composer: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      gap: 10,
      marginBottom: 14,
    },
    composerLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    composerInput: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    composerFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    counter: {
      fontSize: 11,
      color: c.textTertiary,
    },
    postBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    postBtnDisabled: { opacity: 0.5 },
    postBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.onPrimary,
    },
    err: {
      fontSize: 12,
      color: c.danger,
      fontWeight: '600',
    },
    pressed: { opacity: 0.88 },

    list: { gap: 10 },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderLeftWidth: 4,
      gap: 8,
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    pillText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    time: {
      fontSize: 11,
      color: c.textTertiary,
    },
    subject: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    body: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    meta: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
    },
    rowActions: {
      flexDirection: 'row',
      gap: 14,
    },

    editInput: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    editActions: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'flex-end',
    },
    ghostBtn: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    ghostBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
    },
    primaryBtnSm: {
      paddingVertical: 7,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: c.primary,
      minWidth: 60,
      alignItems: 'center',
    },
    primaryBtnSmText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.onPrimary,
    },
  });
}
