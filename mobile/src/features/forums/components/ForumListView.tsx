import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';

import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import BrandRefreshIndicator from '../../../components/ui/BrandPullToRefresh';
import { describeFetchError } from '../../../services/fetchError';
import SearchBar from './SearchBar';
import CategoryChips, { type ChipItem } from './CategoryChips';
import ForumCard from './ForumCard';
import { useForumHome } from '../hooks/useForumHome';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';
import { useChromeScroll } from '../../../components/layout/chromeScroll/ChromeScrollContext';
import { searchResults as apiSearchForums } from '../../../services/searchApi';
import type { Forum } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  onForumPress: (forum: Forum) => void;
  topInset?: number;
}

export default function ForumListView({ onForumPress, topInset = 0 }: Props) {
  const [activeCat, setActiveCat] = useState('all');
  const [activeSubCat, setActiveSubCat] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  // The Tab.Navigator's bottom bar is position:absolute, so pad the list bottom
  // by its height to keep the last card visible above the bar.
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const isSearchMode = debouncedSearch.length > 0;

  const apiCategoryId = useMemo(() => {
    if (isSearchMode) return null;
    if (activeSubCat !== 'all') return Number(activeSubCat);
    if (activeCat !== 'all')    return Number(activeCat);
    return null;
  }, [activeCat, activeSubCat, isSearchMode]);

  const {
    data,
    isLoading: listLoading,
    isRefetching: listRefetching,
    isError: listError,
    error: listErr,
    refetch: listRefetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useForumHome(apiCategoryId);

  const searchQuery = useQuery({
    queryKey: ['forum-search', debouncedSearch],
    queryFn: () => apiSearchForums({ q: debouncedSearch, entityType: 'Forum', pageSize: 50 }),
    enabled: isSearchMode,
    staleTime: 60 * 1000,
  });

  const firstPage = data?.pages[0];
  const categories = useMemo(() => firstPage?.categories || [], [firstPage]);
  const subCatMap = useMemo(() => firstPage?.subCatMap || {}, [firstPage]);
  const listTotalCount = firstPage?.totalForumCount ?? 0;

  // Infinite scroll: concatenate every loaded page.
  const listForums = useMemo<Forum[]>(
    () => data?.pages.flatMap((p) => p.forums) ?? [],
    [data],
  );

  const searchForums = useMemo<Forum[]>(() => {
    if (!isSearchMode || !searchQuery.data?.results) return [];
    return searchQuery.data.results.map(r => ({
      id: r.entityId,
      name: r.title,
      description: r.summary ?? '',
      categoryId: 0,
      slug: r.url ?? '',
      topicCount: 0,
      postCount: 0,
      followCount: 0,
      rank: 0,
      prevRank: 0,
      rankDisplay: '',
      bg: '',
      emoji: '',
      bannerUrl: null,
      thumbnailUrl: r.imageUrl,
      locked: false,
      hot: false,
      priorityPosts: 0,
      editPosts: 0,
      deletePosts: 0,
    }));
  }, [isSearchMode, searchQuery.data]);

  const displayForums = isSearchMode ? searchForums : listForums;
  const totalCount = isSearchMode ? searchForums.length : listTotalCount;
  const isLoading = isSearchMode ? searchQuery.isLoading : (listLoading && !data);
  const isError = isSearchMode ? searchQuery.isError : (listError && !data);

  const catChips: ChipItem[] = useMemo(() => {
    const chips: ChipItem[] = [{ id: 'all', label: 'All' }];
    categories.forEach(c => chips.push({ id: String(c.id), label: c.name }));
    return chips;
  }, [categories]);

  const subCatChips: ChipItem[] = useMemo(() => {
    if (activeCat === 'all') return [];
    const subs = subCatMap[Number(activeCat)] || [];
    if (subs.length === 0) return [];
    return [{ id: 'all', label: 'All' }, ...subs.map(s => ({ id: String(s.id), label: s.name }))];
  }, [activeCat, subCatMap]);

  function selectCat(id: string) {
    setActiveCat(id);
    setActiveSubCat('all');
  }

  function selectSubCat(id: string) {
    setActiveSubCat(id);
  }

  const { applyScroll: applyChromeScroll, resetChrome } = useScrollChrome();
  const { chromeProgress } = useChromeScroll();
  const safeTop = useSafeAreaInsets().top;
  const [chipsHeight, setChipsHeight] = useState(0);

  // Show the sticky dock only in non-search list mode (primary chips only
  // exist there). The reserved padding/refresh offset also collapses when the
  // dock is hidden.
  const showStickyChips = !isSearchMode;
  const stickyDockHeight = showStickyChips ? chipsHeight : 0;

  const listScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyChromeScroll(e);
    },
  });

  // Primary chip strip tracks the top bar: slides up with it and locks at the
  // status-bar safe inset so category filtering stays one tap away.
  const chipsDockStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(chromeProgress.value, [0, 1], [topInset, safeTop]),
  }));

  const onChipsLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h !== chipsHeight) setChipsHeight(h);
  }, [chipsHeight]);

  if (isLoading) return <LoadingState height={400} />;
  if (isError) return (
    <ErrorState
      message={describeFetchError(
        isSearchMode ? searchQuery.error : listErr,
        isSearchMode ? "Couldn't search forums." : "Couldn't load forums.",
      )}
      onRetry={() => isSearchMode ? searchQuery.refetch() : listRefetch()}
    />
  );

  return (
    <View style={styles.flexFill}>
    <Animated.FlatList
      ref={listRef}
      style={styles.flexFill}
      data={displayForums}
      keyExtractor={f => String(f.id)}
      renderItem={({ item }) => <ForumCard forum={item} onPress={onForumPress} />}
      onScroll={!isSearchMode ? listScrollHandler : undefined}
      scrollEventThrottle={16}
      refreshControl={
        !isSearchMode ? (
          <RefreshControl
            refreshing={listRefetching}
            onRefresh={() => {
              resetChrome();
              listRefetch();
            }}
            // OS spinner hidden — BrandRefreshIndicator paints on top.
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            progressViewOffset={topInset + stickyDockHeight}
          />
        ) : undefined
      }
      ListHeaderComponent={
        <View>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search forums..."
          />
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {totalCount.toLocaleString()} FORUMS
            </Text>
            {isSearchMode && <Text style={styles.filteredTag}>search results</Text>}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>
            {isSearchMode ? 'No forums found' : 'No forums yet'}
          </Text>
          {isSearchMode && (
            <Text style={styles.emptySubtitle}>Try a different search term</Text>
          )}
        </View>
      }
      ListFooterComponent={
        !isSearchMode && isFetchingNextPage ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      onEndReached={() => {
        if (!isSearchMode && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + stickyDockHeight },
        { paddingBottom: tabBarHeight },
      ]}
    />
    {showStickyChips && (
      <Animated.View
        style={[styles.chipsDock, chipsDockStyle]}
        pointerEvents="box-none"
      >
        <View style={styles.chipsDockInner} onLayout={onChipsLayout}>
          <CategoryChips
            chips={catChips}
            activeId={activeCat}
            onChange={selectCat}
          />
          {subCatChips.length > 0 && (
            <CategoryChips
              chips={subCatChips}
              activeId={activeSubCat}
              onChange={selectSubCat}
              variant="secondary"
            />
          )}
        </View>
      </Animated.View>
    )}
    {!isSearchMode && (
      <BrandRefreshIndicator refreshing={listRefetching} topInset={topInset + stickyDockHeight} />
    )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingTop: 0,
    },
    chipsDock: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 5,
      backgroundColor: c.bg,
    },
    chipsDockInner: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
    },
    countText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.5,
    },
    filteredTag: {
      fontSize: 10,
      fontWeight: '700',
      color: c.primary,
      backgroundColor: c.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
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
    flexFill: {
      flex: 1,
    },
  });
}
