import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import type { ActivityDto } from '../../types';
import TabShell from './TabShell';
import { stripHtml, timeAgo } from '../../utils/format';
import Avatar from '../Avatar';
import WallComposerSheet from '../../../activities/components/WallComposerSheet';
import OwnWallComposer from '../../../activities/components/OwnWallComposer';
import EditActivitySheet from '../../../activities/components/EditActivitySheet';
import {
  deleteActivity,
  reactToContent,
  REACTION_LOVED,
} from '../../../activities/services/activitiesApi';
import SubFilterPills, { type SubFilter } from '../SubFilterPills';
import { useProfile } from '../../hooks/useProfile';
import { extractApiError } from '../../../../services/api';
import { hapticError, hapticSuccess, hapticTap } from '../../../../utils/haptics';

// Activity tab mirrors the live web layout: composer first, then a
// sub-filter row (ALL / WALL / SLAMBOOK / TESTIMONIAL), then the feed.
// Each sub-filter maps to a `mode=` value on /user-activities.
type ActivityTabKey = 'activity' | 'wall' | 'slambook' | 'testimonial';

const SUB_FILTERS: SubFilter<ActivityTabKey>[] = [
  { key: 'activity', label: 'All' },
  { key: 'wall', label: 'Wall' },
  { key: 'slambook', label: 'Slambook' },
  { key: 'testimonial', label: 'Testimonial' },
];

interface Props {
  userId: number | string;
  isOwn: boolean;
  viewedUserName?: string;
}

const TAB_COPY: Record<
  ActivityTabKey,
  { emptyTitle: (own: boolean) => string; emptySub?: string; composeLabel: string; emptyIcon: keyof typeof Ionicons.glyphMap }
> = {
  activity: {
    emptyTitle: (own) => (own ? 'No activity yet' : 'No activity to show'),
    emptySub: 'Your wall updates, testimonials, and posts will appear here.',
    composeLabel: 'Write on wall',
    emptyIcon: 'pulse-outline',
  },
  wall: {
    emptyTitle: (own) => (own ? 'No wall posts yet' : 'No wall posts'),
    emptySub: 'Wall posts and friendly notes will appear here.',
    composeLabel: 'Write on wall',
    emptyIcon: 'book-outline',
  },
  slambook: {
    emptyTitle: () => 'No slambook entries yet',
    emptySub: 'Memories shared by buddies will appear here.',
    composeLabel: 'Add a slambook entry',
    emptyIcon: 'heart-outline',
  },
  testimonial: {
    emptyTitle: () => 'No testimonials yet',
    emptySub: 'Vouches from buddies will appear here.',
    composeLabel: 'Write a testimonial',
    emptyIcon: 'ribbon-outline',
  },
};

// Pull the first <img src="..."> out of the stored content HTML so we can
// render the attached image. Activities embed images inline (see
// composeHtml.ts) — the API also surfaces an `imageUrl` field but it isn't
// always populated, so we fall back to parsing.
function extractFirstImageSrc(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m?.[1] ?? null;
}

export default function ActivityTab({ userId, isOwn, viewedUserName }: Props) {
  const [filter, setFilter] = useState<ActivityTabKey>('activity');
  const q = useProfileTab({ tab: filter, userId, isOwn, page: 1 });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const meQ = useProfile();
  const meId = meQ.data?.userId;

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityDto | null>(null);

  const items: ActivityDto[] =
    q.data && q.data.kind === 'activity' ? q.data.items : [];

  const copy = TAB_COPY[filter];
  // The "Got something to say?" inline composer is the own-profile entry
  // point on every sub-filter (the web shows it above the WALL/SLAMBOOK/
  // TESTIMONIAL tabs). Visitors instead see the sheet-style composer trigger.
  const showOwnComposer = isOwn;
  const showVisitorComposer = !isOwn;

  const remove = useMutation({
    mutationFn: (activityId: number | string) => deleteActivity(activityId),
    onSuccess: (res) => {
      if (!res.isSuccess) {
        hapticError();
        Alert.alert('Error', res.message || 'Failed to delete.');
        return;
      }
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['profile-tab', 'activity'] });
    },
    onError: (err) => {
      hapticError();
      Alert.alert('Error', extractApiError(err, 'Failed to delete.'));
    },
  });

  function confirmDelete(activityId: number | string) {
    Alert.alert('Delete this post?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(activityId) },
    ]);
  }

  return (
    <>
      {showOwnComposer ? <OwnWallComposer /> : null}
      {showVisitorComposer ? (
        <Pressable
          onPress={() => setComposerOpen(true)}
          style={({ pressed }) => [styles.composeBtn, pressed && styles.pressed]}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={styles.composeBtnText}>{copy.composeLabel}</Text>
        </Pressable>
      ) : null}

      <SubFilterPills filters={SUB_FILTERS} active={filter} onChange={setFilter} />

      <TabShell
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        onRetry={q.refetch}
        isEmpty={items.length === 0}
        emptyIcon={copy.emptyIcon}
        emptyTitle={copy.emptyTitle(isOwn)}
        emptySubtitle={isOwn ? copy.emptySub : undefined}
      >
        <View style={styles.list}>
          {items.map((a) => (
            <ActivityCard
              key={String(a.activityId)}
              a={a}
              meId={meId}
              isDeleting={remove.isPending && String(remove.variables) === String(a.activityId)}
              onEdit={() => setEditing(a)}
              onDelete={() => confirmDelete(a.activityId)}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
      </TabShell>

      {showVisitorComposer ? (
        <WallComposerSheet
          visible={composerOpen}
          onClose={() => setComposerOpen(false)}
          wallUserId={userId}
          wallUserName={viewedUserName || 'user'}
          defaultKind={
            filter === 'slambook' || filter === 'testimonial' ? filter : undefined
          }
        />
      ) : null}

      <EditActivitySheet
        visible={!!editing}
        activity={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

interface CardProps {
  a: ActivityDto;
  meId: number | string | undefined;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

function ActivityCard({ a, meId, isDeleting, onEdit, onDelete, styles, colors }: CardProps) {
  const body = stripHtml(a.content || a.subject);
  const imageSrc = a.imageUrl || extractFirstImageSrc(a.content);
  const authorName = a.realName?.trim() || a.userName?.trim() || 'Someone';
  const authorHandle = a.userName?.trim() ? '@' + a.userName.trim() : null;
  const isOwnPost = meId != null && String(a.userId) === String(meId);
  // Show "→ Recipient" only when posting on someone else's wall — hides the
  // awkward "Author → Author" case for self-wall updates.
  const recipientName =
    String(a.userId) !== String(a.wallUserId) ? a.wallUserName?.trim() || null : null;

  // Optimistic like state — server is source of truth, so we don't try to
  // hydrate a "viewer has liked?" boolean from the list payload (it isn't
  // returned). We just track the toggle locally for instant feedback.
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  async function toggleLike() {
    if (likeBusy) return;
    hapticTap();
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeBusy(true);
    try {
      const res = await reactToContent({
        contentType: a.contentTypeId,
        contentId: a.activityId,
        reactionType: REACTION_LOVED,
        operationType: nextLiked ? 1 : 0,
      });
      if (!res.success) setLiked(!nextLiked);
    } catch {
      setLiked(!nextLiked);
    } finally {
      setLikeBusy(false);
    }
  }

  function handleReply() {
    hapticTap();
    Alert.alert('Coming soon', 'Replying to wall posts is coming soon.');
  }

  function handleMenu() {
    if (!isOwnPost) return;
    Alert.alert('Post options', undefined, [
      { text: 'Edit', onPress: onEdit },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar
          url={null}
          userId={a.userId}
          updateChecksum={a.updateChecksum}
          avatarType={a.avatarType}
          name={authorName}
          size={40}
        />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.author} numberOfLines={1}>{authorName}</Text>
            {recipientName ? (
              <>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                <Text style={styles.recipient} numberOfLines={1}>{recipientName}</Text>
              </>
            ) : null}
          </View>
          {authorHandle ? (
            <Text style={styles.handle} numberOfLines={1}>{authorHandle}</Text>
          ) : null}
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.time}>{timeAgo(a.publishedWhen)}</Text>
          </View>
        </View>
        {isOwnPost ? (
          <Pressable
            onPress={handleMenu}
            disabled={isDeleting}
            hitSlop={8}
            style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}
            accessibilityLabel="Post options"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        ) : null}
      </View>

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
      {imageSrc ? (
        <Image source={imageSrc} style={styles.image} contentFit="cover" />
      ) : null}
      {a.linkUrl ? (
        <View style={styles.linkChip}>
          <Ionicons name="link-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.linkText} numberOfLines={1}>
            {a.linkUrl}
          </Text>
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={toggleLike}
          disabled={likeBusy}
          hitSlop={4}
          style={({ pressed }) => [
            styles.likeBtn,
            liked && styles.likeBtnActive,
            pressed && styles.pressed,
          ]}
          accessibilityLabel="Like"
        >
          <Text style={[styles.likeBtnText, liked && styles.likeBtnTextActive]}>LIKE</Text>
        </Pressable>
        <Pressable
          onPress={handleReply}
          hitSlop={4}
          style={({ pressed }) => [styles.replyBtn, pressed && styles.pressed]}
          accessibilityLabel="Reply"
        >
          <Text style={styles.replyBtnText}>Reply</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    composeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
      marginTop: 8,
    },
    composeBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.3,
    },
    pressed: { opacity: 0.85 },

    list: {
      gap: 10,
      paddingVertical: 4,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    author: {
      fontSize: 14,
      fontWeight: '800',
      color: c.primary,
    },
    recipient: {
      fontSize: 14,
      fontWeight: '800',
      color: c.primary,
    },
    handle: {
      fontSize: 12,
      color: c.textTertiary,
      fontWeight: '600',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    time: {
      fontSize: 11,
      color: c.textTertiary,
    },
    menuBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },

    subject: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    body: {
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
    },
    image: {
      width: '100%',
      height: 180,
      borderRadius: 10,
    },

    linkChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    linkText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
    },

    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    likeBtn: {
      paddingHorizontal: 18,
      height: 32,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    likeBtnActive: {
      backgroundColor: c.primary,
    },
    likeBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.6,
    },
    likeBtnTextActive: {
      color: c.onPrimary,
    },
    replyBtn: {
      paddingHorizontal: 18,
      height: 32,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.success,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    replyBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.success,
      letterSpacing: 0.4,
    },
  });
}
