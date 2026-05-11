import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';

import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import { describeFetchError } from '../../../services/fetchError';
import SearchBar from './SearchBar';
import CategoryChips, { type ChipItem } from './CategoryChips';
import ForumCard from './ForumCard';
import JumpToPageSheet from './JumpToPageSheet';
import ForumPaginationBar from './ForumPaginationBar';
import { useForumHome, FORUM_HOME_PAGE_SIZE } from '../hooks/useForumHome';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';
import { searchResults as apiSearchForums } from '../../../services/searchApi';
import type { Forum } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpSheetOpen, setJumpSheetOpen] = useState(false);
  const listRef = useRef<any>(null);
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // The Tab.Navigator's bottom bar is now position:absolute, so this component
  // extends to the device bottom. Lift the pagination dock by the tab bar
  // height so it sits above the bar, and pad the list bottom by both.
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
    isFetching: listFetching,
    isRefetching: listRefetching,
    isError: listError,
    error: listErr,
    refetch: listRefetch,
  } = useForumHome(apiCategoryId, currentPage);

  const searchQuery = useQuery({
    queryKey: ['forum-search', debouncedSearch],
    queryFn: () => apiSearchForums({ q: debouncedSearch, entityType: 'Forum', pageSize: 50 }),
    enabled: isSearchMode,
    staleTime: 60 * 1000,
  });

  const firstPage = data?.pages[0];
  const categories = firstPage?.categories || [];
  const subCatMap = firstPage?.subCatMap || {};
  const listTotalCount = firstPage?.totalForumCount ?? 0;

  // Page-by-page pagination: show only the current page's items, not all
  // accumulated pages. Matches the live website's behavior.
  const listForums = useMemo<Forum[]>(
    () => firstPage?.forums ?? [],
    [firstPage],
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
    setCurrentPage(1);
  }

  function selectSubCat(id: string) {
    setActiveSubCat(id);
    setCurrentPage(1);
  }

  const totalPages = firstPage?.totalPages ?? 1;
  const { hidden: barHidden, applyScroll: applyBarScroll } = useHideOnScroll();
  const { applyScroll: applyChromeScroll, resetChrome } = useScrollChrome();

  const listScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyChromeScroll(e);
      applyBarScroll(e);
    },
  });

  const handleJumpToPage = useCallback((page: number) => {
    setJumpSheetOpen(false);
    setCurrentPage(page);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, []);

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
            tintColor={colors.primary}
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
          {!isSearchMode && (
            <>
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
            </>
          )}
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
        !isSearchMode && listFetching && !listRefetching ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      contentContainerStyle={[
        styles.content,
        topInset > 0 && { paddingTop: topInset },
        // 80px ≈ pagination bar height; without this the last forum card sits
        // behind the bar.
        { paddingBottom: tabBarHeight + 80 },
      ]}
    />
    {!isSearchMode && (
      <View style={[styles.paginationDock, { bottom: tabBarHeight }]} pointerEvents="box-none">
        <ForumPaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={FORUM_HOME_PAGE_SIZE}
          totalItems={totalCount}
          itemLabel="forums"
          hidden={barHidden}
          onPageChange={handleJumpToPage}
        />
      </View>
    )}
    <JumpToPageSheet
      visible={jumpSheetOpen}
      currentPage={currentPage}
      totalPages={totalPages}
      label="forums"
      onClose={() => setJumpSheetOpen(false)}
      onJump={handleJumpToPage}
    />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingTop: 0,
    },
    paginationDock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
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
