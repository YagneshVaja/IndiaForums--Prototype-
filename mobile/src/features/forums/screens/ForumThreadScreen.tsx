import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient, useQuery } from '@tanstack/react-query';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import { describeFetchError } from '../../../services/fetchError';
import SearchBar from '../components/SearchBar';
import FlairDropdown from '../components/FlairDropdown';
import ThreadCard from '../components/ThreadCard';
import NewTopicComposerSheet from '../components/NewTopicComposerSheet';
import ForumTopicSettingsSheet from '../components/ForumTopicSettingsSheet';
import JumpToPageSheet from '../components/JumpToPageSheet';
import ForumPaginationBar from '../components/ForumPaginationBar';
import { useForumTopics, FORUM_TOPICS_PAGE_SIZE } from '../hooks/useForumTopics';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import { useMyFavouriteForums } from '../hooks/useMyFavouriteForums';
import { useForumFollowStore, selectForumFollow } from '../store/forumFollowStore';
import { useForumPaginationStore, selectForumPage } from '../store/forumPaginationStore';
import { formatCount } from '../utils/format';
import type { ForumsStackParamList } from '../../../navigation/types';
import { searchTopics, setForumFollow, type Forum, type ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'ForumThread'>;
type Rt  = RouteProp<ForumsStackParamList, 'ForumThread'>;

export default function ForumThreadScreen() {
  const navigation = useNavigation<Nav>();
  const { forum } = useRoute<Rt>().params;
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  // Tab.Navigator's bottom bar is position:absolute (chrome hide-on-scroll),
  // so this screen extends to the device bottom. Lift the pagination dock and
  // the list's bottom padding by the bar height so neither sits behind it.
  const tabBarHeight = useBottomTabBarHeight();

  const [activeFlairId, setActiveFlairId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Restore the page the user was last viewing in this forum (across navigation cycles).
  const persistedPage = useForumPaginationStore(selectForumPage(forum.id));
  const [currentPage, setCurrentPage] = useState(persistedPage);
  const [jumpSheetOpen, setJumpSheetOpen] = useState(false);
  // Measured dock height (scrubber + button row + range text + paddings).
  // Defaults to 80 to avoid layout jump on first frame; replaced on onLayout.
  const [paginationDockHeight, setPaginationDockHeight] = useState(80);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);
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

  const [debouncedQuery, setDebouncedQuery] = useState('');

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    prefetchPage,
  } = useForumTopics(forum.id, currentPage);

  const firstPage = data?.pages[0];
  const detail: Forum = firstPage?.forumDetail || forum;
  const flairs = useMemo(() => firstPage?.flairs || [], [firstPage]);
  const hasModerationRights =
    (detail.priorityPosts ?? 0) > 0 ||
    (detail.editPosts ?? 0) > 0 ||
    (detail.deletePosts ?? 0) > 0;

  // Page-by-page pagination: only the current page's topics are displayed.
  const allTopics = useMemo<ForumTopic[]>(
    () => firstPage?.topics ?? [],
    [firstPage],
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

  // Tight debounce — 200ms feels snappy, still bundles fast typing.
  useEffect(() => {
    const q = search.trim();
    const t = setTimeout(() => setDebouncedQuery(q), 200);
    return () => clearTimeout(t);
  }, [search]);

  // React Query handles caching (re-typing a recent query is instant) and
  // automatically aborts in-flight requests when `queryKey` changes — so
  // typing 'war' → 'wars' cancels the stale 'war' request mid-flight.
  const searchQuery = useQuery({
    queryKey: ['forum-topic-search', debouncedQuery],
    queryFn: ({ signal }) =>
      searchTopics({ query: debouncedQuery, forumId: detail.id }, signal),
    enabled: debouncedQuery.length > 0,
    staleTime: 60_000,
  });
  const searchLoading = searchQuery.isFetching && debouncedQuery.length > 0;
  const apiResults = searchQuery.data;

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Instant-feedback local filter — runs on every keystroke against the
    // already-loaded topics so the user sees something immediately while
    // the API request is still in flight.
    let local = allTopics;
    if (activeFlairId != null) {
      local = local.filter(t => t.flairId === activeFlairId);
    }
    if (q) {
      local = local.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.poster.toLowerCase().includes(q)
      );
    }

    // Once API results land for the *current* debounced query, prefer them.
    if (q && debouncedQuery === q && apiResults && apiResults.length > 0) {
      return apiResults as unknown as ForumTopic[];
    }
    return local;
  }, [allTopics, activeFlairId, search, debouncedQuery, apiResults]);

  const handleTopicPress = useCallback((topic: ForumTopic) => {
    navigation.navigate('TopicDetail', { topic, forum: detail });
  }, [navigation, detail]);

  const renderTopicItem = useCallback(
    ({ item }: { item: ForumTopic }) => (
      <ThreadCard topic={item} forum={detail} flairs={flairs} onPress={handleTopicPress} />
    ),
    [detail, flairs, handleTopicPress],
  );

  // Total page count is derived from the forum's topic count — the
  // /forums/:id/topics endpoint only signals `hasMore`, not totals.
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((detail.topicCount ?? 0) / FORUM_TOPICS_PAGE_SIZE)),
    [detail.topicCount],
  );

  // While searching or filtering by flair, the result set isn't paginated; we
  // hide the bar so the UI doesn't lie about which page the user is on.
  const isFiltering = activeFlairId !== null || search.trim().length > 0;

  const { hidden: barHidden, applyScroll: applyBarScroll } = useHideOnScroll();
  const { applyScroll: applyChromeScroll, resetChrome } = useScrollChrome();

  // Without this reset, chrome state carries over from the previous screen
  // (e.g. a deep-scrolled ForumsMainScreen) and the tab bar stays hidden
  // while we're on this screen, leaving the pagination bar floating mid-page.
  useFocusEffect(
    useCallback(() => {
      resetChrome();
    }, [resetChrome]),
  );

  // Throttle scroll-position writes to the persistence store. 250ms is
  // responsive enough that a quick tap-to-topic-and-back lands within a few
  // px of where you were. Skip writes for 600ms after a page change so the
  // auto-scroll-to-0 doesn't overwrite the offset we want to remember.
  const lastSavedRef = useRef(0);

  // JS-thread callback called via runOnJS from the worklet handler.
  const saveScrollY = useCallback(
    (y: number) => {
      const now = Date.now();
      if (now - pageChangedAtRef.current < 600) return;
      if (now - lastSavedRef.current < 250) return;
      lastSavedRef.current = now;
      useForumPaginationStore.getState().setForumScroll(forum.id, currentPage, y);
    },
    [forum.id, currentPage],
  );

  const listScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyChromeScroll(e);
      applyBarScroll(e);
      runOnJS(saveScrollY)(e.contentOffset.y);
    },
  });

  // Tracks when the current page changed — we suppress scroll-save writes for
  // a short window after, so the auto-scroll-to-0 on page change doesn't
  // clobber the offset we just persisted (or are about to restore).
  const pageChangedAtRef = useRef(0);

  const handleJumpToPage = useCallback((page: number) => {
    if (page === currentPage) return;
    setJumpSheetOpen(false);
    pageChangedAtRef.current = Date.now();
    setCurrentPage(page);
    useForumPaginationStore.getState().setForumPage(forum.id, page);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [forum.id, currentPage]);

  // Restore the user's scroll position on this page once data has loaded.
  // Only fires on (forumId, currentPage) change — not on every scroll.
  const restoreKey = `${forum.id}:${currentPage}`;
  useEffect(() => {
    if (!firstPage) return;
    const y = useForumPaginationStore.getState().getForumScroll(forum.id, currentPage) ?? 0;
    if (y > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: y, animated: false });
      });
    }
    // Re-evaluate when the user jumps pages or the data first lands. The
    // restoreKey covers both forumId and page in a single dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreKey, !!firstPage]);

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
         
        <AnimatedFlashList
          ref={listRef}
          data={filteredTopics}
          keyExtractor={(t: ForumTopic) => String(t.id)}
          renderItem={renderTopicItem}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onScroll={!isFiltering ? (listScrollHandler as any) : undefined}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <View>
              {/* Banner — real photo OR colored placeholder so layout stays consistent */}
              <View style={styles.bannerWrap}>
                {detail.bannerUrl ? (
                  <Image source={{ uri: detail.bannerUrl }} style={styles.banner} />
                ) : (
                  <View style={[styles.banner, { backgroundColor: detail.bg }]} />
                )}
                {/* Subtle dark gradient at the bottom for legibility on busy banners */}
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']}
                  style={styles.bannerOverlay}
                />
              </View>

              {/* Forum identity — modern detail header */}
              <View style={styles.identity}>
                <View style={[styles.identityTopRow, styles.identityTopRowOverlap]}>
                  <View
                    style={[
                      styles.identityAvatar,
                      { backgroundColor: detail.bg },
                      styles.identityAvatarOverlap,
                    ]}
                  >
                    {detail.thumbnailUrl ? (
                      <Image source={{ uri: detail.thumbnailUrl }} style={styles.identityAvatarImg} />
                    ) : (
                      <Text style={styles.identityEmoji}>{detail.emoji}</Text>
                    )}
                  </View>

                  <View style={styles.identityActions}>
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
                          style={styles.iconBtn}
                          onPress={() => navigation.navigate('ReportsInbox', { forum: detail })}
                          accessibilityLabel="Reports inbox"
                        >
                          <Ionicons name="flag-outline" size={16} color={colors.text} />
                        </Pressable>
                        <Pressable
                          style={styles.iconBtn}
                          onPress={() => setSettingsOpen(true)}
                          accessibilityLabel="Forum settings"
                        >
                          <Ionicons name="settings-outline" size={16} color={colors.text} />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>

                <Text style={styles.identityName}>{detail.name}</Text>
                {!!detail.description && (
                  <Text style={styles.identityDesc}>{detail.description}</Text>
                )}
              </View>

              {/* Stats bar — rank gets the marquee accent treatment */}
              <View style={styles.statBar}>
                <StatCell label="Topics" value={formatCount(detail.topicCount)} styles={styles} />
                <View style={styles.statDivider} />
                <StatCell label="Posts" value={formatCount(detail.postCount)} styles={styles} />
                <View style={styles.statDivider} />
                <StatCell label="Followers" value={formatCount(followCount)} styles={styles} />
                <View style={styles.statDivider} />
                <StatCell
                  label="Ranked"
                  value={detail.rank > 0 ? `#${detail.rank}` : '–'}
                  accent={detail.rank > 0}
                  styles={styles}
                />
              </View>

              {/* Search */}
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search topics…"
              />

              {/* Flair + count + new — count grouped with filter for visual cohesion */}
              <View style={styles.flairBar}>
                <View style={styles.flairLeft}>
                  {flairs.length > 0 && (
                    <FlairDropdown
                      flairs={flairs}
                      activeId={activeFlairId}
                      onChange={setActiveFlairId}
                    />
                  )}
                  {searchLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.topicCount}>
                      {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
                <Pressable style={styles.newBtn} onPress={() => setNewTopicOpen(true)}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.newBtnText}>New</Text>
                </Pressable>
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
            isFetching ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: tabBarHeight + paginationDockHeight + 12 }}
        />
      )}

      {!isFiltering && !!firstPage && (
        <View
          style={[styles.paginationDock, { bottom: tabBarHeight }]}
          pointerEvents="box-none"
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h && Math.abs(h - paginationDockHeight) > 1) {
              setPaginationDockHeight(h);
            }
          }}
        >
          <ForumPaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={FORUM_TOPICS_PAGE_SIZE}
            totalItems={detail.topicCount ?? 0}
            itemLabel="topics"
            hidden={barHidden}
            onPageChange={handleJumpToPage}
            onPrefetchPage={prefetchPage}
          />
        </View>
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

      <JumpToPageSheet
        visible={jumpSheetOpen}
        currentPage={currentPage}
        totalPages={totalPages}
        label="topics"
        onClose={() => setJumpSheetOpen(false)}
        onJump={handleJumpToPage}
        onPrefetchPage={prefetchPage}
      />

      {toast && (
        <Pressable style={styles.toast} onPress={() => setToast(null)}>
          <Text style={styles.toastText} numberOfLines={2}>{toast}</Text>
        </Pressable>
      )}
    </View>
  );
}

function StatCell({ label, value, accent, styles }: {
  label: string;
  value: string;
  accent?: boolean;
  styles: Styles;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statNum, accent && styles.statNumAccent]}>{value}</Text>
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
    paginationDock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    bannerWrap: {
      position: 'relative',
    },
    banner: {
      width: '100%',
      height: 140,
      backgroundColor: c.surface,
    },
    bannerOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 80,
    },
    identity: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 16,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    identityTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    identityTopRowOverlap: {
      // When a banner is present, the row anchors to where the avatar overlaps
      marginTop: -36,
    },
    identityAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    identityAvatarOverlap: {
      borderWidth: 4,
      borderColor: c.card,
    },
    identityAvatarImg: {
      width: '100%',
      height: '100%',
    },
    identityEmoji: {
      fontSize: 32,
    },
    identityActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    identityName: {
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
      lineHeight: 26,
    },
    identityDesc: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 6,
      lineHeight: 19,
    },
    followBtn: {
      backgroundColor: c.primary,
      paddingVertical: 9,
      paddingHorizontal: 18,
      borderRadius: 999,
      minWidth: 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    followBtnActive: {
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
      paddingVertical: 8,
    },
    followBtnBusy: {
      opacity: 0.7,
    },
    followBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.onPrimary,
    },
    followBtnTextActive: {
      color: c.primary,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
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
    statNumAccent: {
      color: '#EA580C',
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
    flairLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    topicCount: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.primary,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    newBtnText: {
      fontSize: 13,
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
      paddingVertical: 8,
    },
    footerLoading: {
      paddingVertical: 12,
    },
  });
}
