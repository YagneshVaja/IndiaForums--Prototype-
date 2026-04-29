import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import { describeFetchError } from '../../../services/fetchError';
import SearchBar from '../components/SearchBar';
import FlairDropdown from '../components/FlairDropdown';
import ThreadCard from '../components/ThreadCard';
import NewTopicComposerSheet from '../components/NewTopicComposerSheet';
import ForumTopicSettingsSheet from '../components/ForumTopicSettingsSheet';
import { useForumTopics } from '../hooks/useForumTopics';
import { useMyFavouriteForums } from '../hooks/useMyFavouriteForums';
import { useForumFollowStore, selectForumFollow } from '../store/forumFollowStore';
import { formatCount } from '../utils/format';
import type { ForumsStackParamList } from '../../../navigation/types';
import { searchTopics, setForumFollow, type Forum, type ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'ForumThread'>;
type Rt  = RouteProp<ForumsStackParamList, 'ForumThread'>;

export default function ForumThreadScreen() {
  const navigation = useNavigation<Nav>();
  const { forum } = useRoute<Rt>().params;
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeFlairId, setActiveFlairId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // null = not in search mode, [] = api returned nothing, 'fallback' = use client filter
  const [searchResults, setSearchResults] = useState<ForumTopic[] | 'fallback' | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useForumTopics(forum.id);

  const firstPage = data?.pages[0];
  const detail: Forum = firstPage?.forumDetail || forum;
  const flairs = firstPage?.flairs || [];
  const hasModerationRights =
    (detail.priorityPosts ?? 0) > 0 ||
    (detail.editPosts ?? 0) > 0 ||
    (detail.deletePosts ?? 0) > 0;

  const allTopics = useMemo<ForumTopic[]>(
    () => (data?.pages || []).flatMap(p => p.topics),
    [data],
  );

  // Bootstrap follow state from the cached "My Forums" list — if this forum
  // appears in any loaded page, the current user already follows it.
  const { data: myForumsData } = useMyFavouriteForums(true);
  const isFollowingFromCache = useMemo(() => {
    for (const page of myForumsData?.pages ?? []) {
      if (page.forums.some(f => f.id === detail.id)) return true;
    }
    return false;
  }, [myForumsData, detail.id]);

  const followSlot = useForumFollowStore(selectForumFollow(detail.id));
  const isFollowing = followSlot.isFollowing ?? isFollowingFromCache;
  const followCount = followSlot.countOverride ?? detail.followCount;

  const handleToggleFollow = useCallback(async () => {
    if (followBusy) return;
    const next = !isFollowing;
    const baseCount = followSlot.countOverride ?? detail.followCount;
    const optimisticCount = Math.max(0, baseCount + (next ? 1 : -1));
    setFollowBusy(true);
    // Optimistic update.
    useForumFollowStore.getState().set(detail.id, {
      isFollowing: next,
      countOverride: optimisticCount,
    });
    const res = await setForumFollow(detail.id, next);
    setFollowBusy(false);
    if (res.ok) {
      // Refresh the lists that show followed forums so server-side counts and
      // membership reconcile with our optimistic state.
      queryClient.invalidateQueries({ queryKey: ['my-favourite-forums'] });
      queryClient.invalidateQueries({ queryKey: ['profile-tab', 'forums'] });
    } else {
      // Roll back.
      useForumFollowStore.getState().set(detail.id, {
        isFollowing: !next,
        countOverride: baseCount,
      });
      showToast(res.error ?? 'Could not update follow.');
    }
  }, [followBusy, isFollowing, followSlot.countOverride, detail.id, detail.followCount, queryClient, showToast]);

  // Live API search with 350 ms debounce; falls back to client-side on error
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults(null);
      setSearchLoading(false);
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      return;
    }
    setSearchLoading(true);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      const results = await searchTopics({ query: q, forumId: detail.id });
      if (results.length > 0) {
        setSearchResults(results as unknown as ForumTopic[]);
      } else {
        setSearchResults('fallback');
      }
      setSearchLoading(false);
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, detail.id]);

  const filteredTopics = useMemo(() => {
    // API returned results — use them
    if (Array.isArray(searchResults)) return searchResults;

    let list = allTopics;
    if (activeFlairId != null) {
      list = list.filter(t => t.flairId === activeFlairId);
    }
    // Client-side fallback (searchResults === 'fallback' or no search)
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.poster.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTopics, activeFlairId, search, searchResults]);

  const handleTopicPress = useCallback((topic: ForumTopic) => {
    navigation.navigate('TopicDetail', { topic, forum: detail });
  }, [navigation, detail]);

  const renderTopicItem = useCallback(
    ({ item }: { item: ForumTopic }) => (
      <ThreadCard topic={item} forum={detail} flairs={flairs} onPress={handleTopicPress} />
    ),
    [detail, flairs, handleTopicPress],
  );

  return (
    <View style={styles.screen}>
      <TopNavBack title={detail.name} onBack={() => navigation.goBack()} />

      {isLoading && !data ? (
        <LoadingState height={400} />
      ) : isError && !data ? (
        <ErrorState
          message={describeFetchError(error, "Couldn't load topics.")}
          onRetry={() => refetch()}
        />
      ) : (
        <FlashList
          data={filteredTopics}
          keyExtractor={t => String(t.id)}
          renderItem={renderTopicItem}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View>
              {detail.bannerUrl && (
                <Image source={{ uri: detail.bannerUrl }} style={styles.banner} />
              )}

              {/* Forum identity */}
              <View style={styles.identity}>
                <View style={[styles.identityAvatar, { backgroundColor: detail.bg }]}>
                  {detail.thumbnailUrl ? (
                    <Image source={{ uri: detail.thumbnailUrl }} style={styles.identityAvatarImg} />
                  ) : (
                    <Text style={styles.identityEmoji}>{detail.emoji}</Text>
                  )}
                </View>
                <View style={styles.identityInfo}>
                  <Text style={styles.identityName} numberOfLines={1}>{detail.name}</Text>
                  {!!detail.description && (
                    <Text style={styles.identityDesc} numberOfLines={2}>{detail.description}</Text>
                  )}
                </View>
                <Pressable
                  style={[
                    styles.followBtn,
                    isFollowing && styles.followBtnActive,
                    followBusy && styles.followBtnBusy,
                  ]}
                  onPress={handleToggleFollow}
                  disabled={followBusy}
                  accessibilityRole="button"
                  accessibilityLabel={isFollowing ? 'Unfollow forum' : 'Follow forum'}
                >
                  {followBusy ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? colors.primary : colors.onPrimary}
                    />
                  ) : (
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </Pressable>
                {hasModerationRights && (
                  <>
                    <Pressable
                      style={styles.gearBtn}
                      onPress={() => navigation.navigate('ReportsInbox', { forum: detail })}
                      accessibilityLabel="Reports inbox"
                    >
                      <Ionicons name="flag-outline" size={16} color={colors.text} />
                    </Pressable>
                    <Pressable style={styles.gearBtn} onPress={() => setSettingsOpen(true)}>
                      <Ionicons name="settings-outline" size={16} color={colors.text} />
                    </Pressable>
                  </>
                )}
              </View>

              {/* Stats bar */}
              <View style={styles.statBar}>
                <StatCell label="Topics" value={formatCount(detail.topicCount)} styles={styles} />
                <View style={styles.statDivider} />
                <StatCell label="Posts" value={formatCount(detail.postCount)} styles={styles} />
                <View style={styles.statDivider} />
                <StatCell label="Followers" value={formatCount(followCount)} styles={styles} />
                <View style={styles.statDivider} />
                <StatCell label="Ranked" value={`#${detail.rank || '–'}`} styles={styles} />
              </View>

              {/* Search */}
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search topics…"
              />

              {/* Flair + count + new */}
              <View style={styles.flairBar}>
                {flairs.length > 0 ? (
                  <FlairDropdown
                    flairs={flairs}
                    activeId={activeFlairId}
                    onChange={setActiveFlairId}
                  />
                ) : <View />}
                <View style={styles.flairRight}>
                  {searchLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.topicCount}>
                      {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                  <Pressable style={styles.newBtn} onPress={() => setNewTopicOpen(true)}>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                    <Text style={styles.newBtnText}>New</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{search.trim() ? '🔍' : '📭'}</Text>
              <Text style={styles.emptyTitle}>
                {search.trim() ? 'No results found' : 'No topics yet'}
              </Text>
              {!!search.trim() && (
                <Text style={styles.emptySubtitle}>Nothing matched "{search.trim()}"</Text>
              )}
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={styles.content}
        />
      )}

      <NewTopicComposerSheet
        visible={newTopicOpen}
        forum={detail}
        flairs={flairs}
        onClose={() => setNewTopicOpen(false)}
        onCreated={() => {
          setNewTopicOpen(false);
          refetch();
        }}
      />

      <ForumTopicSettingsSheet
        visible={settingsOpen}
        forum={detail}
        topics={allTopics}
        onClose={() => setSettingsOpen(false)}
        onActionComplete={() => refetch()}
      />

      {toast && (
        <Pressable style={styles.toast} onPress={() => setToast(null)}>
          <Text style={styles.toastText} numberOfLines={2}>{toast}</Text>
        </Pressable>
      )}
    </View>
  );
}

function StatCell({ label, value, styles }: { label: string; value: string; styles: Styles }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: {
      paddingBottom: 24,
    },
    banner: {
      width: '100%',
      height: 120,
      backgroundColor: c.surface,
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    identityAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    identityAvatarImg: {
      width: '100%',
      height: '100%',
    },
    identityEmoji: {
      fontSize: 24,
    },
    identityInfo: {
      flex: 1,
      minWidth: 0,
    },
    identityName: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
    },
    identityDesc: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
      lineHeight: 15,
    },
    followBtn: {
      backgroundColor: c.primary,
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 16,
      minWidth: 84,
      alignItems: 'center',
      justifyContent: 'center',
    },
    followBtnActive: {
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
      paddingVertical: 6,
    },
    followBtnBusy: {
      opacity: 0.7,
    },
    followBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.onPrimary,
    },
    followBtnTextActive: {
      color: c.primary,
    },
    toast: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 24,
      backgroundColor: c.text,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    toastText: {
      color: c.card,
      fontSize: 12,
      fontWeight: '600',
    },
    gearBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
    },
    statNum: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statDivider: {
      width: 1,
      height: 24,
      backgroundColor: c.border,
    },
    flairBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 8,
    },
    flairRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    topicCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
    },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    newBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.onPrimary,
    },
    empty: {
      alignItems: 'center',
      padding: 40,
      gap: 8,
    },
    emptyIcon: {
      fontSize: 36,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    emptySubtitle: {
      fontSize: 12,
      color: c.textTertiary,
      textAlign: 'center',
    },
    footer: {
      paddingVertical: 16,
    },
  });
}
