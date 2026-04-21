import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, Image, Pressable, FlatList, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getThreadLikes, REACTION_META,
  type TopicPost, type ThreadLiker,
} from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

interface Props {
  post: TopicPost | null;
  visible: boolean;
  onClose: () => void;
}

export default function ReactionsSheet({ post, visible, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [likers, setLikers]   = useState<ThreadLiker[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (!visible || !post) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveTab('all');
    getThreadLikes(post.id).then(res => {
      if (cancelled) return;
      if (res.ok) setLikers(res.likers);
      else setError(res.error || 'Could not load reactions.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, post]);

  const countsByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of likers) {
      const key = String(l.likeType || 1);
      m[key] = (m[key] || 0) + 1;
    }
    return m;
  }, [likers]);

  const tabs = useMemo(() => {
    const typeTabs = Object.entries(countsByType)
      .sort((a, b) => b[1] - a[1])
      .map(([lt, count]) => ({
        key:   lt,
        emoji: REACTION_META[Number(lt)]?.emoji ?? '👍',
        label: REACTION_META[Number(lt)]?.label ?? 'Like',
        count,
      }));
    return [
      { key: 'all', emoji: null as string | null, label: 'All', count: likers.length },
      ...typeTabs,
    ];
  }, [countsByType, likers.length]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return likers;
    return likers.filter(l => String(l.likeType || 1) === activeTab);
  }, [likers, activeTab]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Reactions</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <FlatList
              horizontal
              data={tabs}
              keyExtractor={t => t.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
              renderItem={({ item }) => {
                const active = item.key === activeTab;
                return (
                  <Pressable
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => setActiveTab(item.key)}
                  >
                    {item.emoji && <Text style={styles.tabEmoji}>{item.emoji}</Text>}
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
                    <Text style={[styles.tabCount, active && styles.tabCountActive]}>{item.count}</Text>
                  </Pressable>
                );
              }}
            />
          </View>

          <View style={styles.listWrap}>
            {loading && (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Loading reactions…</Text>
              </View>
            )}

            {!loading && error && (
              <View style={styles.stateBox}>
                <Text style={styles.stateError}>{error}</Text>
              </View>
            )}

            {!loading && !error && filtered.length === 0 && (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>No reactions yet.</Text>
              </View>
            )}

            {!loading && !error && filtered.length > 0 && (
              <FlatList
                data={filtered}
                keyExtractor={(l, i) => `${l.userId || 'x'}-${i}`}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => <LikerRow liker={item} styles={styles} accent={colors.primary} />}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LikerRow({ liker, styles, accent }: { liker: ThreadLiker; styles: Styles; accent: string }) {
  const emoji = REACTION_META[liker.likeType]?.emoji ?? '👍';
  const initial = (liker.displayName || liker.userName || 'U').charAt(0).toUpperCase();
  return (
    <View style={styles.row}>
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, liker.avatarAccent ? { backgroundColor: liker.avatarAccent } : { backgroundColor: accent }]}>
          {liker.avatarUrl ? (
            <Image source={{ uri: liker.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarLetter}>{initial}</Text>
          )}
        </View>
        <View style={styles.reactCorner}>
          <Text style={styles.reactCornerEmoji}>{emoji}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.displayName} numberOfLines={1}>{liker.displayName}</Text>
        <View style={styles.metaRow}>
          {!!liker.userName && <Text style={styles.username} numberOfLines={1}>@{liker.userName}</Text>}
          {!!liker.groupName && (
            <View style={styles.rankPill}>
              <Text style={styles.rankText}>{liker.groupName}</Text>
              {liker.userLevel != null && (
                <Text style={styles.rankNum}>{liker.userLevel}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {liker.badges.length > 0 && (
        <View style={styles.badges}>
          {liker.badges.slice(0, 3).map(b => (
            <Image key={b.id} source={{ uri: b.imageUrl }} style={styles.badgeImg} />
          ))}
          {liker.badges.length > 3 && (
            <Text style={styles.badgeExtra}>+{liker.badges.length - 3}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
      maxHeight: '80%',
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 3,
      backgroundColor: c.border,
      marginTop: 4,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    headerTitle: { fontSize: 15, fontWeight: '800', color: c.text },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    tabs: {
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tabsContent: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: c.surface,
    },
    tabActive: {
      backgroundColor: c.primary,
    },
    tabEmoji: { fontSize: 13 },
    tabLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tabLabelActive: { color: '#FFFFFF' },
    tabCount: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textTertiary,
    },
    tabCountActive: { color: '#FFFFFF' },
    listWrap: {
      minHeight: 140,
    },
    listContent: {
      paddingVertical: 6,
      paddingBottom: 20,
    },
    stateBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 8,
    },
    stateText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textTertiary,
    },
    stateError: {
      fontSize: 12,
      fontWeight: '600',
      color: c.danger,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    avatarWrap: {
      position: 'relative',
      width: 40, height: 40,
    },
    avatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarLetter: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    reactCorner: {
      position: 'absolute',
      right: -4, bottom: -4,
      width: 20, height: 20,
      borderRadius: 10,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15, shadowRadius: 2,
      elevation: 2,
    },
    reactCornerEmoji: { fontSize: 11 },
    info: { flex: 1, minWidth: 0 },
    displayName: { fontSize: 13, fontWeight: '800', color: c.text },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    username: { fontSize: 11, color: c.textTertiary, flexShrink: 1 },
    rankPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
      backgroundColor: c.primarySoft,
    },
    rankText: { fontSize: 10, fontWeight: '700', color: c.primary },
    rankNum: {
      fontSize: 9, fontWeight: '800', color: '#FFFFFF',
      backgroundColor: c.primary,
      paddingHorizontal: 4,
      borderRadius: 6,
    },
    badges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    badgeImg: { width: 18, height: 18 },
    badgeExtra: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
    },
  });
}
