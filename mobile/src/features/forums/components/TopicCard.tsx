import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { parseTopReactionTypes, REACTION_META, type ForumTopic } from '../../../services/api';
import { formatCount } from '../utils/format';
import { stripPostHtml } from '../utils/stripHtml';
import { extractSocialUrls } from '../utils/socialUrls';
import SocialEmbed from './SocialEmbed';
import PostHtml from './PostHtml';
import type { AnchorRect } from './ReactionPickerSheet';
import { ensureOpPost, useTopicLike } from '../hooks/useTopicLike';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

interface Props {
  topic: ForumTopic;
  viewMode: 'detailed' | 'compact';
  onPress?: (
    topic: ForumTopic,
    opts?: { jumpToLast?: boolean; autoAction?: 'like' | 'reply' | 'quote' },
  ) => void;
  /** Open a reply composer for this topic without leaving the listing. */
  onReply?: (topic: ForumTopic) => void;
  /** Open a reply composer pre-quoted with this topic's OP. */
  onQuote?: (topic: ForumTopic) => void;
  /** Surface a transient message (sign-in prompt, like error). */
  onToast?: (msg: string) => void;
  /** Open the full reaction picker anchored to the LIKE button. */
  onOpenReactionPicker?: (topic: ForumTopic, anchor: AnchorRect) => void;
  /** Open the bottom-sheet list of users who reacted. */
  onOpenReactionsList?: (topic: ForumTopic) => void;
}

const PREVIEW_TEXT_LINES = 2;

function TopicCardImpl({
  topic, viewMode, onPress, onReply, onQuote, onOpenReactionPicker, onOpenReactionsList,
}: Props) {
  const detailed = viewMode === 'detailed';
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { reaction, opLikeCount, pending, opPost } = useTopicLike(topic);
  const liked = reaction != null;
  const reactionMeta = reaction != null ? REACTION_META[reaction] : null;

  // Stacked-emoji breakdown — derived from the OP post's reactionJson once it
  // has been fetched (lazy: first reaction tap or first reactions-list open).
  // Falls back to the user's own reaction emoji, then a single 👍.
  const topReactionTypes = useMemo(
    () => parseTopReactionTypes(opPost?.reactionJson),
    [opPost?.reactionJson],
  );
  const stackedEmojis = useMemo<string[]>(() => {
    if (topReactionTypes.length > 0) {
      return topReactionTypes
        .slice(0, 3)
        .map((c) => REACTION_META[c]?.emoji)
        .filter(Boolean) as string[];
    }
    if (reactionMeta) return [reactionMeta.emoji];
    return ['👍'];
  }, [topReactionTypes, reactionMeta]);

  const likeBtnRef = useRef<View>(null);

  function handleOpenPicker() {
    if (!onOpenReactionPicker) return;
    likeBtnRef.current?.measureInWindow((x, y, width, height) => {
      onOpenReactionPicker(topic, { x, y, width, height });
    });
  }

  function handleReply() {
    if (onReply) onReply(topic);
    else onPress?.(topic, { autoAction: 'reply' });
  }

  function handleQuote() {
    if (onQuote) onQuote(topic);
    else onPress?.(topic, { autoAction: 'quote' });
  }

  const socialUrls = useMemo(
    () => extractSocialUrls(topic.description),
    [topic.description],
  );

  // Preview text keeps social URLs in-place so they appear as clickable text,
  // matching the live site (the SocialEmbed below renders the rich preview).
  const previewText = useMemo(
    () => stripPostHtml(topic.description).trim(),
    [topic.description],
  );

  // Rich HTML for the expanded view — preserves bold/italic/links/quotes.
  // Social URLs stay in the HTML so PostHtml renders them as anchor links;
  // the SocialEmbed components render the rich previews below.
  const richHtml = useMemo(() => topic.description?.trim() || '', [topic.description]);

  // Every detailed card starts collapsed for visual consistency. Tapping
  // Expand reveals full content and the action bar; the button then hides.
  const [expanded, setExpanded] = useState(false);

  // Once expanded we need OP-level reaction data (count + breakdown) so the
  // pill matches what the reactions sheet will show. Cached per session.
  useEffect(() => {
    if (!expanded || opPost) return;
    ensureOpPost(topic);
  }, [expanded, opPost, topic]);

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(topic)}>
      <View style={styles.headerRow}>
        {topic.forumThumbnail ? (
          <Image
            source={{ uri: topic.forumThumbnail }}
            style={detailed ? styles.forumAvatar : styles.forumAvatarSmall}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={detailed ? styles.forumAvatarFallback : styles.forumAvatarFallbackSmall}>
            <Text style={styles.forumAvatarFallbackText}>
              {(topic.forumName || 'F').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.headerCol}>
          <Text style={styles.forumName} numberOfLines={1}>{topic.forumName}</Text>
          <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>
          <Text style={styles.postedBy} numberOfLines={1}>
            Posted by: <Text style={styles.strong}>{topic.poster}</Text> · {topic.time}
          </Text>
        </View>
      </View>

      {detailed && (!!previewText || socialUrls.length > 0 || topic.topicImage) && (
        <View style={styles.divider} />
      )}

      {detailed && !expanded && !!previewText && (
        <Text style={styles.desc} numberOfLines={PREVIEW_TEXT_LINES}>
          {previewText}
        </Text>
      )}

      {detailed && expanded && !!richHtml && (
        <PostHtml html={richHtml} horizontalPadding={52} />
      )}

      {detailed && socialUrls.map((u) => (
        <View key={u} style={styles.embedWrap}>
          <SocialEmbed url={u} />
        </View>
      ))}

      {detailed && topic.topicImage && (
        <Image
          source={{ uri: topic.topicImage }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      )}

      {detailed && !expanded && (
        <Pressable
          style={styles.expandBtn}
          onPress={() => setExpanded(true)}
          hitSlop={6}
        >
          <Text style={styles.expandText}>Expand</Text>
          <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
        </Pressable>
      )}

      {detailed && expanded && (
        <View style={styles.actionBar}>
          {opLikeCount == null ? (
            // OP not yet fetched — show a neutral placeholder so the card
            // doesn't display a misleading topic-aggregate count.
            <View style={styles.reactionSummary}>
              <View style={[styles.reactionIconWrap, styles.reactionIconWrapEmpty]}>
                <Ionicons name="thumbs-up" size={11} color={colors.textTertiary} />
              </View>
              <Text style={styles.reactionCount}>—</Text>
            </View>
          ) : opLikeCount > 0 ? (
            <Pressable
              style={styles.reactionSummary}
              onPress={() => onOpenReactionsList?.(topic)}
              hitSlop={6}
            >
              <View style={styles.emojiStack}>
                {stackedEmojis.map((e, i) => (
                  <View
                    key={`${e}-${i}`}
                    style={[styles.emojiChip, i > 0 && styles.emojiChipOverlap]}
                  >
                    <Text style={styles.emojiChipText}>{e}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.reactionCount}>{formatCount(opLikeCount)}</Text>
            </Pressable>
          ) : (
            <View style={styles.reactionSummary}>
              <View style={[styles.reactionIconWrap, styles.reactionIconWrapEmpty]}>
                <Ionicons name="thumbs-up" size={11} color={colors.textTertiary} />
              </View>
              <Text style={styles.reactionCount}>0</Text>
            </View>
          )}
          <View style={styles.actionButtons}>
            <View ref={likeBtnRef} collapsable={false}>
              <ReactionBtn
                reactionEmoji={reactionMeta?.emoji ?? null}
                reactionLabel={reactionMeta?.label ?? null}
                tint={colors.primary}
                onPress={handleOpenPicker}
                styles={styles}
                loading={pending}
                active={liked}
              />
            </View>
            <ActionBtn
              icon="create-outline"
              label="REPLY"
              tint="#34C759"
              onPress={handleReply}
              styles={styles}
            />
            <ActionBtn
              icon="chatbox-ellipses-outline"
              label="QUOTE"
              tint={colors.textSecondary}
              onPress={handleQuote}
              styles={styles}
            />
          </View>
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.statsLeft}>
          <Stat icon="thumbs-up-outline" value={formatCount(topic.likes)} styles={styles} iconColor={colors.textSecondary} />
          <Stat icon="eye-outline" value={formatCount(topic.views)} styles={styles} iconColor={colors.textSecondary} />
          <Stat icon="chatbubble-outline" value={formatCount(topic.replies)} styles={styles} iconColor={colors.textSecondary} />
          <Stat icon="share-social-outline" value="Share" styles={styles} iconColor={colors.textSecondary} />
        </View>
        {topic.lastBy ? (
          <Pressable
            style={styles.lastReply}
            onPress={() => onPress?.(topic, { jumpToLast: true })}
            hitSlop={6}
          >
            <Ionicons name="arrow-undo" size={11} color={colors.textTertiary} />
            <Text style={styles.lastReplyText} numberOfLines={1}>
              {topic.lastTime} by {topic.lastBy}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const TopicCard = React.memo(TopicCardImpl);
export default TopicCard;

function Stat({ icon, value, styles, iconColor }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  styles: Styles;
  iconColor: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={13} color={iconColor} />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

function ReactionBtn({
  reactionEmoji, reactionLabel, tint, onPress, styles, loading, active,
}: {
  reactionEmoji: string | null;
  reactionLabel: string | null;
  tint: string;
  onPress: () => void;
  styles: Styles;
  loading?: boolean;
  active?: boolean;
}) {
  const label = (reactionLabel ?? 'Like').toUpperCase();
  return (
    <Pressable
      style={[styles.actionBtn, active && styles.actionBtnActive]}
      onPress={onPress}
      hitSlop={6}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : reactionEmoji ? (
        <Text style={styles.actionBtnEmoji}>{reactionEmoji}</Text>
      ) : (
        <Ionicons name="thumbs-up-outline" size={14} color={tint} />
      )}
      <Text style={[styles.actionBtnLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

function ActionBtn({ icon, label, tint, onPress, styles, loading, active }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  tint: string;
  onPress: () => void;
  styles: Styles;
  loading?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionBtn, active && styles.actionBtnActive]}
      onPress={onPress}
      hitSlop={6}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <Ionicons name={icon} size={14} color={tint} />
      )}
      <Text style={[styles.actionBtnLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 12,
      marginHorizontal: 14,
      marginBottom: 10,
      gap: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    headerCol: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    forumAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
    },
    forumAvatarSmall: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.surface,
    },
    forumAvatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    forumAvatarFallbackSmall: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    forumAvatarFallbackText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    forumName: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
      lineHeight: 21,
      marginTop: 1,
    },
    postedBy: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 2,
    },
    strong: {
      color: c.textSecondary,
      fontWeight: '600',
    },
    desc: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 2,
    },
    image: {
      width: '100%',
      height: 160,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    embedWrap: {
      borderRadius: 10,
      overflow: 'hidden',
    },
    expandBtn: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    expandText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    reactionSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    reactionIconWrap: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reactionIconWrapEmpty: {
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    emojiStack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emojiChip: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    emojiChipOverlap: {
      marginLeft: -6,
    },
    emojiChipText: {
      fontSize: 10,
      lineHeight: 12,
    },
    reactionCount: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 8,
    },
    actionBtnActive: {
      backgroundColor: c.primarySoft,
    },
    actionBtnLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    actionBtnEmoji: {
      fontSize: 14,
      lineHeight: 16,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    statsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexShrink: 0,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
    },
    lastReply: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
      flexShrink: 1,
      paddingVertical: 4,
    },
    lastReplyText: {
      fontSize: 10,
      color: c.textTertiary,
      maxWidth: 130,
    },
  });
}
