import React, { useMemo } from 'react';
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
import { stripPostHtml } from '../utils/stripHtml';
import { extractSocialUrls, stripSocialUrlsFromText } from '../utils/socialUrls';
import SocialEmbed from './SocialEmbed';

interface Props {
  post: TopicPost;
  index: number;
  reaction: ReactionCode | null;
  likeCount: number;
  pendingReaction: boolean;
  isMine: boolean;
  canModerate: boolean;
  onQuickReact: (post: TopicPost) => void;
  onLongPressReact: (post: TopicPost) => void;
  onPressReactionSummary?: (post: TopicPost) => void;
  onReply: (post: TopicPost) => void;
  onQuote: (post: TopicPost) => void;
  onEdit: (post: TopicPost) => void;
  onShare: (post: TopicPost) => void;
  onTrash: (post: TopicPost) => void;
  onPressEdited?: (post: TopicPost) => void;
  onPressAvatar?: (post: TopicPost) => void;

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
  isMine, canModerate,
  onQuickReact, onLongPressReact, onPressReactionSummary,
  onReply, onQuote, onEdit, onShare, onTrash, onPressEdited, onPressAvatar,
  isEditing, editText, editSaving, editError,
  onChangeEditText, onSaveEdit, onCancelEdit,
}: Props) {
  const bg = post.avatarAccent || ACCENTS[post.authorId % ACCENTS.length];
  const initial = (post.author || 'A').charAt(0).toUpperCase();
  const flag = countryFlag(post.countryCode);

  const socialUrls = useMemo(() => extractSocialUrls(post.message), [post.message]);
  const body = useMemo(
    () => stripSocialUrlsFromText(stripPostHtml(post.message)),
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
          <View style={styles.authorRow}>
            <Text style={styles.author} numberOfLines={1}>{post.author}</Text>
            {post.isOp && <View style={styles.opBadge}><Text style={styles.opBadgeText}>OP</Text></View>}
            {!!flag && <Text style={styles.flag}>{flag}</Text>}
          </View>
          {!!post.realName && (
            <Text style={styles.realName} numberOfLines={1}>{post.realName}</Text>
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
              {post.badges.map(b => (
                <Image
                  key={b.id}
                  source={{ uri: b.imageUrl }}
                  style={styles.badgeImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ))}
            </View>
          )}
        </View>

        <Text style={styles.postNumber}>#{index + 1}</Text>
      </View>

      {isEditing ? (
        <View style={styles.editWrap}>
          <TextInput
            style={styles.editInput}
            value={editText ?? ''}
            onChangeText={onChangeEditText}
            multiline
            placeholder="Edit your post…"
            placeholderTextColor="#9A9A9A"
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
          {!!body && <Text style={styles.body}>{body}</Text>}
          {socialUrls.map(u => (
            <SocialEmbed key={u} url={u} />
          ))}
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

        <Pressable
          style={[styles.action, reacted && styles.actionReacted]}
          onPress={() => onQuickReact(post)}
          onLongPress={() => onLongPressReact(post)}
          disabled={pendingReaction}
          hitSlop={4}
        >
          {reactionEmoji ? (
            <Text style={styles.actionEmoji}>{reactionEmoji}</Text>
          ) : (
            <Ionicons name="heart-outline" size={13} color="#5A5A5A" />
          )}
          <Text style={[styles.actionText, reacted && styles.actionTextReacted]}>
            {reactionLabel}
          </Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => onReply(post)} hitSlop={4}>
          <Ionicons name="chatbubble-outline" size={12} color="#5A5A5A" />
          <Text style={styles.actionText}>Reply</Text>
        </Pressable>

        {isMine ? (
          <Pressable style={styles.action} onPress={() => onEdit(post)} hitSlop={4}>
            <Ionicons name="create-outline" size={12} color="#5A5A5A" />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.action} onPress={() => onQuote(post)} hitSlop={4}>
            <Ionicons name="return-up-back-outline" size={12} color="#5A5A5A" />
            <Text style={styles.actionText}>Quote</Text>
          </Pressable>
        )}

        {canModerate && !isMine && (
          <Pressable style={styles.action} onPress={() => onTrash(post)} hitSlop={4}>
            <Ionicons name="trash-outline" size={12} color="#dc2626" />
            <Text style={[styles.actionText, styles.actionTextDanger]}>Trash</Text>
          </Pressable>
        )}

        <Pressable style={styles.action} onPress={() => onShare(post)} hitSlop={4}>
          <Ionicons name="share-outline" size={12} color="#5A5A5A" />
        </Pressable>
      </View>
    </View>
  );
}

const PostCard = React.memo(PostCardImpl);
export default PostCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEEFF1',
  },
  cardOp: {
    borderColor: '#3558F0',
    borderWidth: 1.5,
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
    borderColor: '#3558F0',
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
    color: '#1A1A1A',
    flexShrink: 1,
  },
  opBadge: {
    backgroundColor: '#3558F0',
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
    color: '#7A7A7A',
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
    backgroundColor: '#EEEFF1',
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
    color: '#5A5A5A',
  },
  rankTextColored: {
    color: '#FFFFFF',
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  metaDot: {
    fontSize: 10,
    color: '#C0C0C0',
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
  postNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B0B0B0',
  },
  body: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
    marginTop: 10,
  },
  editedLine: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#8A8A8A',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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
    backgroundColor: '#F5F6F7',
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
    color: '#5A5A5A',
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
    backgroundColor: '#EEF2FF',
  },
  actionEmoji: {
    fontSize: 13,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A5A5A',
  },
  actionTextReacted: {
    color: '#3558F0',
  },
  actionTextDanger: {
    color: '#dc2626',
  },
  editWrap: {
    marginTop: 10,
    gap: 8,
  },
  editInput: {
    minHeight: 90,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#C9D4F6',
    backgroundColor: '#F7F9FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    textAlignVertical: 'top',
  },
  editError: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
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
    borderColor: '#E2E2E2',
    backgroundColor: '#FFFFFF',
  },
  editCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A5A5A',
  },
  editSaveBtn: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#3558F0',
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
