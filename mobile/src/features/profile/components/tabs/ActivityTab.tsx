import React, { useState } from 'react';
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
import { useThemedStyles } from '../../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import type { ActivityDto } from '../../types';
import TabShell from './TabShell';
import { fmtNum, stripHtml, timeAgo } from '../../utils/format';
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
  const styles = useThemedStyles(makeStyles);
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
  // returned). We just track the toggle locally for instant feedback. Count
  // is also kept locally so the badge bumps on tap.
  const initialLikeCount = (() => {
    const v = a.likeCount;
    if (v == null) return 0;
    const n = typeof v === 'string' ? parseInt(v, 10) : v;
    return Number.isFinite(n) ? Number(n) : 0;
  })();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likeBusy, setLikeBusy] = useState(false);

  async function toggleLike() {
    if (likeBusy) return;
    hapticTap();
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    setLikeBusy(true);
    try {
      const res = await reactToContent({
        contentType: a.contentTypeId,
        contentId: a.activityId,
        reactionType: REACTION_LOVED,
        operationType: nextLiked ? 1 : 0,
      });
      if (!res.success) {
        setLiked(!nextLiked);
        setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
      }
    } catch {
      setLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
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
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={14}
            color={liked ? colors.onPrimary : colors.primary}
          />
          <Text style={[styles.likeBtnText, liked && styles.likeBtnTextActive]}>LIKE</Text>
          {likeCount > 0 ? (
            <Text style={[styles.likeCountText, liked && styles.likeBtnTextActive]}>
              {fmtNum(likeCount)}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          onPress={handleReply}
          hitSlop={4}
          style={({ pressed }) => [styles.replyBtn, pressed && styles.pressed]}
          accessibilityLabel="Reply"
        >
          <Ionicons name="chatbubble-outline" size={13} color={colors.success} />
          <Text style={styles.replyBtnText}>Reply</Text>
          {Number(a.commentCount) > 0 ? (
            <Text style={styles.replyCountText}>{fmtNum(a.commentCount)}</Text>
          ) : null}
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
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },

    list: {
      gap: 10,
      paddingVertical: 6,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    author: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: -0.1,
    },
    recipient: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: -0.1,
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
      marginTop: 1,
    },
    time: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '500',
    },
    menuBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
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
      lineHeight: 21,
    },
    image: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      backgroundColor: c.surface,
    },

    linkChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
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
      paddingTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      marginTop: 2,
    },
    likeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 16,
      height: 36,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.primary,
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
    likeCountText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
      marginLeft: 2,
    },
    replyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 16,
      height: 36,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.success,
      backgroundColor: 'transparent',
    },
    replyBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.success,
      letterSpacing: 0.4,
    },
    replyCountText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.success,
      marginLeft: 2,
    },
  });
}
