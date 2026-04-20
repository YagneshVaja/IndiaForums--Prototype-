import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TopicPost } from '../../../services/api';
import { formatCount } from '../utils/format';
import { stripPostHtml } from '../utils/stripHtml';

interface Props {
  post: TopicPost;
  index: number;
  liked: boolean;
  likeCount: number;
  pendingReaction: boolean;
  onToggleLike: (post: TopicPost) => void;
}

const ACCENTS = ['#3558F0', '#7c2d12', '#065f46', '#4c1d95', '#831843', '#4a1942'];

export default function PostCard({
  post, index, liked, likeCount, pendingReaction, onToggleLike,
}: Props) {
  const bg = post.avatarAccent || ACCENTS[post.authorId % ACCENTS.length];
  const initial = (post.author || 'A').charAt(0).toUpperCase();

  const body = useMemo(() => stripPostHtml(post.message), [post.message]);

  const rankKind = useMemo(() => {
    const r = post.rank.toLowerCase();
    if (r.includes('admin') || r.includes('super')) return 'admin';
    if (r.includes('mod')) return 'mod';
    return null;
  }, [post.rank]);

  return (
    <View style={[styles.card, post.isOp && styles.cardOp]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: bg }, post.isOp && styles.avatarOp]}>
          {post.avatarUrl ? (
            <Image source={{ uri: post.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarLetter}>{initial}</Text>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.authorRow}>
            <Text style={styles.author} numberOfLines={1}>{post.author}</Text>
            {post.isOp && <View style={styles.opBadge}><Text style={styles.opBadgeText}>OP</Text></View>}
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
                    color={rankKind ? '#FFFFFF' : '#5A5A5A'}
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
                <Image key={b.id} source={{ uri: b.imageUrl }} style={styles.badgeImg} />
              ))}
            </View>
          )}
        </View>

        <Text style={styles.postNumber}>#{index + 1}</Text>
      </View>

      {!!body && <Text style={styles.body}>{body}</Text>}

      <View style={styles.footer}>
        <Pressable
          style={[styles.footerBtn, liked && styles.footerBtnLiked]}
          onPress={() => onToggleLike(post)}
          disabled={pendingReaction}
          hitSlop={6}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={14}
            color={liked ? '#FFFFFF' : '#666'}
          />
          <Text style={[styles.footerBtnText, liked && styles.footerBtnTextLiked]}>
            {likeCount > 0 ? formatCount(likeCount) : 'Like'}
          </Text>
        </Pressable>
        {post.isEdited && (
          <View style={styles.editedPill}>
            <Ionicons name="create-outline" size={10} color="#8A8A8A" />
            <Text style={styles.editedText}>edited</Text>
          </View>
        )}
      </View>
    </View>
  );
}

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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F5F6F7',
  },
  footerBtnLiked: {
    backgroundColor: '#ef4444',
  },
  footerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  footerBtnTextLiked: {
    color: '#FFFFFF',
  },
  editedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  editedText: {
    fontSize: 10,
    color: '#8A8A8A',
    fontStyle: 'italic',
  },
});
