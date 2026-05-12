import React, { useMemo, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  parseTopReactionTypes,
  REACTION_META,
  type ReactionCode,
  type TopicPost,
} from '../../../services/api';
import { countryFlag, formatCount } from '../utils/format';
import {
  extractPreviewableUrls,
  extractSocialUrls,
  stripSocialUrlsFromHtml,
} from '../utils/socialUrls';
import SocialEmbed from './SocialEmbed';
import LinkPreview from './LinkPreview';
import PostHtml from './PostHtml';
import type { AnchorRect } from './ReactionPickerSheet';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  post: TopicPost;
  index: number;
  reaction: ReactionCode | null;
  likeCount: number;
  pendingReaction: boolean;
  isMine: boolean;
  onOpenReactionPicker: (post: TopicPost, anchor: AnchorRect) => void;
  onPressReactionSummary?: (post: TopicPost) => void;
  onReply: (post: TopicPost) => void;
  onQuote: (post: TopicPost) => void;
  onEdit: (post: TopicPost) => void;
  onPressEdited?: (post: TopicPost) => void;
  onPressAvatar?: (post: TopicPost) => void;
  onPressSettings?: (post: TopicPost) => void;

  isEditing?: boolean;
  editText?: string;
  editSaving?: boolean;
  editError?: string | null;
  onChangeEditText?: (t: string) => void;
  onSaveEdit?: (post: TopicPost) => void;
  onCancelEdit?: () => void;
}

const ACCENTS = ['#3558F0', '#7c2d12', '#065f46', '#4c1d95', '#831843', '#4a1942'];

function PostCardImpl({
  post, index, reaction, likeCount, pendingReaction,
  isMine,
  onOpenReactionPicker, onPressReactionSummary,
  onReply, onQuote, onEdit, onPressEdited, onPressAvatar, onPressSettings,
  isEditing, editText, editSaving, editError,
  onChangeEditText, onSaveEdit, onCancelEdit,
}: Props) {
  const likeBtnRef = useRef<View>(null);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  function openPicker() {
    likeBtnRef.current?.measureInWindow((x, y, width, height) => {
      onOpenReactionPicker(post, { x, y, width, height });
    });
  }
  const bg = post.avatarAccent || ACCENTS[post.authorId % ACCENTS.length];
  const initial = (post.author || 'A').charAt(0).toUpperCase();
  const flag = countryFlag(post.countryCode);

  const socialUrls = useMemo(() => extractSocialUrls(post.message), [post.message]);
  // Article/blog links (anything that isn't a social URL or inline image) —
  // limit to the first one so a link-heavy post doesn't produce a wall of
  // preview cards. Matches how Twitter/Slack surface one rich preview.
  const previewUrl = useMemo(() => {
    const urls = extractPreviewableUrls(post.message);
    return urls.length > 0 ? urls[0] : null;
  }, [post.message]);
  const bodyHtml = useMemo(
    () => stripSocialUrlsFromHtml(post.message),
    [post.message],
  );
  const topTypes = useMemo(() => parseTopReactionTypes(post.reactionJson), [post.reactionJson]);

  const rankKind = useMemo(() => {
    const r = post.rank.toLowerCase();
    if (r.includes('admin') || r.includes('super')) return 'admin';
    if (r.includes('mod')) return 'mod';
    return null;
  }, [post.rank]);

  const reacted = reaction != null;
  const reactionEmoji = reacted ? REACTION_META[reaction].emoji : null;
  const reactionLabel = reacted ? REACTION_META[reaction].label : 'Like';

  return (
    <View style={[styles.card, post.isOp && styles.cardOp]}>
      <View style={styles.header}>
        <Pressable
          onPress={onPressAvatar ? () => onPressAvatar(post) : undefined}
          disabled={!onPressAvatar}
          hitSlop={4}
        >
          <View style={[styles.avatar, { backgroundColor: bg }, post.isOp && styles.avatarOp]}>
            {post.avatarUrl ? (
              <Image
                source={{ uri: post.avatarUrl }}
                style={styles.avatarImg}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <Text style={styles.avatarLetter}>{initial}</Text>
            )}
          </View>
        </Pressable>

        <View style={styles.info}>
          {/* Live-site sequence: real name (primary) → @username (secondary) → */}
          {/* group · level → badges → time. Match the indiaforums.com layout. */}
          <View style={styles.authorRow}>
            <Text style={styles.author} numberOfLines={1}>
              {post.realName || post.author}
            </Text>
            {post.isOp && <View style={styles.opBadge}><Text style={styles.opBadgeText}>OP</Text></View>}
            {!!flag && <Text style={styles.flag}>{flag}</Text>}
          </View>

          {!!post.author && (
            <Text style={styles.username} numberOfLines={1}>@{post.author}</Text>
          )}

          <View style={styles.metaRow}>
            {!!post.rank && (
              <View
                style={[
                  styles.rankPill,
                  rankKind === 'admin' && styles.rankPillAdmin,
                  rankKind === 'mod' && styles.rankPillMod,
                ]}
              >
                {rankKind && (
                  <Ionicons
                    name={rankKind === 'admin' ? 'trophy' : 'shield-checkmark'}
                    size={9}
                    color="#FFFFFF"
                  />
                )}
                <Text
                  style={[
                    styles.rankText,
                    rankKind && styles.rankTextColored,
                  ]}
                >
                  {post.rank}
                </Text>
                {post.userLevel > 0 && !rankKind && (
                  <Text style={styles.rankLevel}>{post.userLevel}</Text>
                )}
              </View>
            )}
            {post.visitStreakCount >= 30 && (
              <View style={styles.streakChip}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakText}>
                  {formatCount(post.visitStreakCount)}
                </Text>
              </View>
            )}
            {post.postCount != null && (
              <Text style={styles.metaText}>
                {formatCount(post.postCount)} posts
              </Text>
            )}
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{post.time}</Text>
          </View>

          {post.badges.length > 0 && (
            <View style={styles.badges}>
              {post.badges.slice(0, 4).map(b => (
                <Image
                  key={b.id}
                  source={{ uri: b.imageUrl }}
                  style={styles.badgeImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ))}
              {post.badges.length > 4 && (
                <View style={styles.badgeMore}>
                  <Text style={styles.badgeMoreText}>+{post.badges.length - 4}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.postNumGroup}>
          <Text style={styles.postNumber}>#{index + 1}</Text>
          {onPressSettings && (
            <Pressable
              onPress={() => onPressSettings(post)}
              hitSlop={8}
              style={styles.gearBtn}
              accessibilityLabel="Post options"
            >
              <Ionicons name="settings-outline" size={14} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {isEditing ? (
        <View style={styles.editWrap}>
          <TextInput
            style={styles.editInput}
            value={editText ?? ''}
            onChangeText={onChangeEditText}
            multiline
            placeholder="Edit your post…"
            placeholderTextColor={colors.textTertiary}
            editable={!editSaving}
          />
          {!!editError && <Text style={styles.editError}>{editError}</Text>}
          <View style={styles.editActions}>
            <Pressable
              style={styles.editCancelBtn}
              onPress={onCancelEdit}
              disabled={editSaving}
            >
              <Text style={styles.editCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.editSaveBtn, editSaving && styles.editSaveBtnDisabled]}
              onPress={() => onSaveEdit?.(post)}
              disabled={editSaving}
            >
              {editSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.editSaveText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {!!bodyHtml && <PostHtml html={bodyHtml} horizontalPadding={48} />}
          {socialUrls.map(u => (
            <SocialEmbed key={u} url={u} />
          ))}
          {previewUrl && <LinkPreview url={previewUrl} />}
        </>
      )}

      {post.isEdited && post.editedWhen && (
        <Pressable onPress={() => onPressEdited?.(post)} hitSlop={4}>
          <Text style={styles.editedLine}>
            Edited by {post.editedBy || post.author}
          </Text>
        </Pressable>
      )}

      <View style={styles.footer}>
        {likeCount > 0 && (
          <Pressable
            style={styles.reactSummary}
            onPress={() => onPressReactionSummary?.(post)}
            hitSlop={4}
          >
            <View style={styles.reactSummaryEmojis}>
              {topTypes.length > 0 ? (
                topTypes.map(lt => (
                  <Text key={lt} style={styles.reactSummaryEmoji}>
                    {REACTION_META[lt]?.emoji ?? '👍'}
                  </Text>
                ))
              ) : (
                <Text style={styles.reactSummaryEmoji}>👍</Text>
              )}
            </View>
            <Text style={styles.reactSummaryCount}>{formatCount(likeCount)}</Text>
          </Pressable>
        )}

        <View style={styles.spacer} />

        <View ref={likeBtnRef} collapsable={false}>
          <Pressable
            style={[styles.action, reacted && styles.actionReacted]}
            onPress={openPicker}
            disabled={pendingReaction}
            hitSlop={4}
          >
            {reactionEmoji ? (
              <Text style={styles.actionEmoji}>{reactionEmoji}</Text>
            ) : (
              <Ionicons name="heart-outline" size={13} color={colors.textSecondary} />
            )}
            <Text style={[styles.actionText, reacted && styles.actionTextReacted]}>
              {reactionLabel}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.action} onPress={() => onReply(post)} hitSlop={4}>
          <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.actionText}>Reply</Text>
        </Pressable>

        {isMine ? (
          <Pressable style={styles.action} onPress={() => onEdit(post)} hitSlop={4}>
            <Ionicons name="create-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.action} onPress={() => onQuote(post)} hitSlop={4}>
            <Ionicons name="return-up-back-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.actionText}>Quote</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const PostCard = React.memo(PostCardImpl);
export default PostCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      marginHorizontal: 12,
      marginTop: 10,
      borderRadius: 12,
      padding: 12,
    },
    cardOp: {
      backgroundColor: c.primarySoft,
      // Left accent rail — Reddit / Slack pattern for "highlighted" or
      // starter posts. Combined with the existing tinted background, OP
      // pill, and avatar border, the OP now reads as the post that
      // started the discussion at a single glance rather than just
      // "reply #1". `paddingLeft` is reduced by the border width so the
      // inner content stays visually aligned with non-OP cards.
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      paddingLeft: 9,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarOp: {
      borderWidth: 2,
      borderColor: c.primary,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    avatarLetter: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    author: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      flexShrink: 1,
    },
    opBadge: {
      backgroundColor: c.primary,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
    },
    opBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
    },
    flag: {
      fontSize: 13,
    },
    realName: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 1,
    },
    username: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      flexWrap: 'wrap',
    },
    rankPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: c.surface,
    },
    rankPillMod: {
      backgroundColor: '#10b981',
    },
    rankPillAdmin: {
      backgroundColor: '#f59e0b',
    },
    rankText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textSecondary,
    },
    rankTextColored: {
      color: '#FFFFFF',
    },
    rankLevel: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      marginLeft: 2,
    },
    streakChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: '#FEF3C7',
    },
    streakIcon: {
      fontSize: 9,
    },
    streakText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#92400E',
    },
    metaText: {
      fontSize: 10,
      fontWeight: '600',
      color: c.textTertiary,
    },
    metaDot: {
      fontSize: 10,
      color: c.textTertiary,
    },
    badges: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 6,
    },
    badgeImg: {
      width: 18,
      height: 18,
    },
    badgeMore: {
      paddingHorizontal: 6,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      backgroundColor: c.surface,
    },
    badgeMoreText: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textSecondary,
    },
    postNumber: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
    },
    postNumGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    gearBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    body: {
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
      marginTop: 10,
    },
    editedLine: {
      fontSize: 11,
      fontStyle: 'italic',
      color: c.textTertiary,
      marginTop: 8,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
      flexWrap: 'wrap',
    },
    spacer: {
      flex: 1,
    },
    reactSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 14,
      backgroundColor: c.surface,
    },
    reactSummaryEmojis: {
      flexDirection: 'row',
    },
    reactSummaryEmoji: {
      fontSize: 12,
      marginRight: -2,
    },
    reactSummaryCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      marginLeft: 4,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    actionReacted: {
      backgroundColor: c.primarySoft,
    },
    actionEmoji: {
      fontSize: 13,
    },
    actionText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    actionTextReacted: {
      color: c.primary,
    },
    editWrap: {
      marginTop: 10,
      gap: 8,
    },
    editInput: {
      minHeight: 90,
      maxHeight: 220,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      textAlignVertical: 'top',
    },
    editError: {
      fontSize: 11,
      fontWeight: '600',
      color: c.danger,
    },
    editActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    editCancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    editCancelText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    editSaveBtn: {
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    editSaveBtnDisabled: {
      opacity: 0.6,
    },
    editSaveText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
