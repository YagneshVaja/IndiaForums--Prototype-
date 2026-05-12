import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, Image, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserMiniProfile,
  type TopicPost, type UserMiniProfile, type PostBadge,
} from '../../../services/api';
import { countryFlag } from '../utils/format';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  post: TopicPost | null;
  visible: boolean;
  onClose: () => void;
  onVisitProfile?: (userId: number, userName: string) => void;
  onMessageUser?: (userId: number, userName: string) => void;
}

export default function UserMiniCard({
  post, visible, onClose, onVisitProfile, onMessageUser,
}: Props) {
  const [profile, setProfile] = useState<UserMiniProfile | null>(null);
  const [fetching, setFetching] = useState(false);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (!visible || !post?.authorId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setFetching(true);
    getUserMiniProfile(post.authorId)
      .then(p => { if (!cancelled) setProfile(p); })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [visible, post?.authorId]);

  const displayName = profile?.displayName || post?.realName || post?.author || 'User';
  const userName    = profile?.userName    || post?.author   || '';
  const avatarUrl   = profile?.thumbnailUrl || post?.avatarUrl || null;
  const bannerUrl   = profile?.bannerUrl   || null;
  const avatarBg    = profile?.avatarAccent || post?.avatarAccent || colors.primary;
  const badges: PostBadge[] = profile?.badges.length ? profile.badges : (post?.badges || []);
  const flag        = countryFlag(post?.countryCode);
  const initial     = (displayName || 'U').charAt(0).toUpperCase();

  const lastSeen = useMemo(() => {
    const raw = profile?.lastVisitedDate;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [profile?.lastVisitedDate]);

  const isOnline = useMemo(() => {
    const raw = profile?.lastVisitedDate;
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    return (Date.now() - d.getTime()) < 24 * 60 * 60 * 1000;
  }, [profile?.lastVisitedDate]);

  if (!post) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </Pressable>

          <View style={styles.banner}>
            {bannerUrl ? (
              <Image source={{ uri: bannerUrl }} style={styles.bannerImg} />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.bannerBg} blurRadius={12} />
            ) : (
              <View style={[styles.bannerBg, { backgroundColor: avatarBg }]} />
            )}
            <View style={styles.bannerFade} />
          </View>

          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetter}>{initial}</Text>
              )}
              {isOnline && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.identity}>
              <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
              <View style={styles.userRow}>
                {!!userName && <Text style={styles.username} numberOfLines={1}>@{userName}</Text>}
                {!!flag && <Text style={styles.flag}>{flag}</Text>}
              </View>

              {(post.rank || post.postCount != null) && (
                <View style={styles.rankRow}>
                  {!!post.rank && (
                    <View style={styles.rankPill}>
                      <Ionicons name="star" size={9} color="#FFFFFF" />
                      <Text style={styles.rankText}>{post.rank}</Text>
                    </View>
                  )}
                  {post.postCount != null && (
                    <Text style={styles.postCountText}>{post.postCount} posts</Text>
                  )}
                </View>
              )}

              {!fetching && lastSeen && (
                <View style={styles.lastSeenRow}>
                  <Ionicons name="time-outline" size={10} color={colors.textTertiary} />
                  <Text style={styles.lastSeenText}>{lastSeen}</Text>
                </View>
              )}
            </View>
          </View>

          {fetching && badges.length === 0 ? (
            <View style={styles.badgesSkeleton}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : badges.length > 0 ? (
            <View style={styles.badges}>
              {badges.slice(0, 6).map(b => (
                <Image key={b.id} source={{ uri: b.imageUrl }} style={styles.badgeImg} />
              ))}
              {badges.length > 6 && (
                <Text style={styles.badgeExtra}>+{badges.length - 6}</Text>
              )}
            </View>
          ) : null}

          <View style={styles.actions}>
            {!!post.authorId && onVisitProfile && (
              <Pressable
                style={styles.visitBtn}
                onPress={() => { onClose(); onVisitProfile(post.authorId, userName); }}
              >
                <Text style={styles.visitBtnText}>Visit Profile</Text>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </Pressable>
            )}
            {!!post.authorId && onMessageUser && (
              <Pressable
                style={styles.msgBtn}
                onPress={() => { onClose(); onMessageUser(post.authorId, userName); }}
              >
                <Ionicons name="mail-outline" size={13} color={colors.primary} />
                <Text style={styles.msgBtnText}>Message</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const BANNER_H = 84;
const AVATAR   = 72;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.card,
      borderRadius: 16,
      overflow: 'hidden',
      paddingBottom: 14,
    },
    closeBtn: {
      position: 'absolute',
      top: 10, right: 10,
      width: 26, height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
    },
    banner: {
      height: BANNER_H,
      backgroundColor: c.primary,
      position: 'relative',
    },
    bannerImg: {
      ...StyleSheet.absoluteFillObject,
      width: '100%', height: '100%',
    },
    bannerBg: {
      ...StyleSheet.absoluteFillObject,
      width: '100%', height: '100%',
      opacity: 0.6,
    },
    bannerFade: {
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 14,
      marginTop: -AVATAR / 2,
    },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 4,
      borderColor: c.card,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarLetter: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
    onlineDot: {
      position: 'absolute',
      right: 4, bottom: 4,
      width: 12, height: 12, borderRadius: 6,
      backgroundColor: '#10b981',
      borderWidth: 2, borderColor: c.card,
    },
    identity: {
      flex: 1,
      minWidth: 0,
      marginTop: AVATAR / 2 + 4,
    },
    displayName: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    username: {
      fontSize: 12,
      color: c.textTertiary,
      flexShrink: 1,
    },
    flag: { fontSize: 13 },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      flexWrap: 'wrap',
    },
    rankPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: c.primary,
    },
    rankText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    postCountText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
    },
    lastSeenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 4,
    },
    lastSeenText: {
      fontSize: 10,
      color: c.textTertiary,
    },
    badgesSkeleton: {
      alignItems: 'center',
      paddingVertical: 10,
      marginTop: 10,
    },
    badges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      marginTop: 12,
      flexWrap: 'wrap',
    },
    badgeImg: { width: 22, height: 22 },
    badgeExtra: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
      marginTop: 14,
    },
    visitBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    visitBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    msgBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: c.card,
    },
    msgBtnText: { color: c.primary, fontSize: 12, fontWeight: '800' },
  });
}
