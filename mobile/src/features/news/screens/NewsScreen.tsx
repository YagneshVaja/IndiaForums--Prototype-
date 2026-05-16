import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NewsStackParamList } from '../../../navigation/types';
import AnimatedTopBar from '../../../components/layout/chromeScroll/AnimatedTopBar';
import { useChromeScroll } from '../../../components/layout/chromeScroll/ChromeScrollContext';
import { useNotificationBell } from '../../../hooks/useNotificationBell';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';
import { useSideMenuStore } from '../../../store/sideMenuStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { useNewsFeed } from '../hooks/useNewsFeed';
import { useIsOnline } from '../../../hooks/useIsOnline';
import { NEWS_CATEGORIES } from '../data/newsStaticData';
import NewsFeedList from '../components/NewsFeedList';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import BrandRefreshIndicator from '../../../components/ui/BrandPullToRefresh';
import type { Article, Gallery, Movie, Video, WebStorySummary } from '../../../services/api';
import { prefetchMovieDetail } from '../../movies/utils/prefetchMovieDetail';

type Props = NativeStackScreenProps<NewsStackParamList, 'NewsMain'>;

export default function NewsScreen({ navigation, route }: Props) {
  // Home's "View all" pill passes initialCategory so the News tab opens
  // pre-filtered to whatever chip was active on Home.
  const initialCategory = route.params?.initialCategory ?? 'all';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  // `appliedCategory` is what actually drives data fetching. It trails
  // `selectedCategory` by a short debounce so rapid chip tapping (A→B→C→D
  // within a second) collapses to a single query for D instead of firing
  // intermediate fetches that briefly flash their data into the feed.
  const [appliedCategory, setAppliedCategory] = useState(initialCategory);

  useEffect(() => {
    const next = route.params?.initialCategory;
    if (next && next !== selectedCategory) {
      setSelectedCategory(next);
      // Deep-link entry should swap data immediately — no debounce.
      setAppliedCategory(next);
    }
    // One-shot sync on param change — not a feedback loop on local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.initialCategory]);

  useEffect(() => {
    if (selectedCategory === appliedCategory) return;
    const t = setTimeout(() => setAppliedCategory(selectedCategory), 140);
    return () => clearTimeout(t);
  }, [selectedCategory, appliedCategory]);

  const styles = useThemedStyles(makeStyles);

  // Match the Forums AllTopicsView pattern exactly: pull `applyScroll` from
  // useScrollChrome and build a fresh `useAnimatedScrollHandler` here. Same
  // chrome behaviour, proven-working combination with Animated.FlatList +
  // onEndReached.
  const { applyScroll: applyChromeScroll, resetChrome } = useScrollChrome();
  const { chromeProgress } = useChromeScroll();
  const safeTop = useSafeAreaInsets().top;

  const listScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyChromeScroll(e);
    },
  });

  // brandInset = measured height of AnimatedTopBar (just the brand row now
  // that the category strip lives outside it).
  // catDockHeight = measured height of the sticky category dock itself.
  // Together they define how far down the FlatList's content has to start so
  // nothing is hidden behind the chrome when both are fully visible.
  const [brandInset, setBrandInset] = useState(0);
  const [catDockHeight, setCatDockHeight] = useState(0);
  const totalInset = brandInset + catDockHeight;

  const { notifCount, openNotifications } = useNotificationBell();

  useFocusEffect(
    useCallback(() => {
      resetChrome();
    }, [resetChrome]),
  );

  // Sticky category dock — same pattern Forums uses for its sort bar
  // (AllTopicsView.tsx). When chrome is fully visible (chromeProgress=0)
  // the dock sits right below the brand row. As the user scrolls and the
  // brand row translates up off-screen (chromeProgress → 1), the dock's
  // paddingTop animates from `brandInset` to `safeTop` so it locks
  // directly under the status bar. Categories therefore stay one tap away
  // at every scroll position — the standard TOI / News18 / Hotstar pattern.
  const catDockStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(chromeProgress.value, [0, 1], [brandInset, safeTop]),
  }));

  const onCatDockLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h !== catDockHeight) setCatDockHeight(h);
  }, [catDockHeight]);

  const isOnline = useIsOnline();
  const {
    items,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNewsFeed(appliedCategory);

  // Pull-to-refresh: invalidate every News-relevant query root in one shot.
  // Articles, videos, galleries, and trending-movies all live under distinct
  // keys so we hit them with a Promise.all.
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    resetChrome();
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['articles', 'news'] }),
        queryClient.invalidateQueries({ queryKey: ['news'] }),
        queryClient.invalidateQueries({ queryKey: ['movies', 'trending'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, resetChrome]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      navigation.navigate('ArticleDetail', {
        id: article.id,
        thumbnailUrl: article.thumbnailUrl,
        title: article.title,
      });
    },
    [navigation],
  );

  // Rail tile handlers. Detail screens are registered directly in NewsStack
  // (see NewsStack.tsx) so these push within the News tab — back gesture
  // returns to the feed at the same scroll position.
  const handleVideoPress = useCallback(
    (video: Video) => navigation.navigate('VideoDetail', { video }),
    [navigation],
  );

  const handleGalleryPress = useCallback(
    (gallery: Gallery) => navigation.navigate('GalleryDetail', { gallery }),
    [navigation],
  );

  const handleMoviePress = useCallback(
    (movie: Movie) => {
      prefetchMovieDetail(queryClient, movie);
      navigation.navigate('MovieDetail', { movie });
    },
    [navigation, queryClient],
  );

  // Visual stories on this feed are real backend WebStorySummary records
  // (same source the Home tab uses). Tap opens WebStoryPlayer at the
  // matching index so the player can swipe through the surrounding stories.
  // Each rail's `stories` slice is passed straight through so the player's
  // index lookup matches the rail the user actually tapped.
  const handleStoryPress = useCallback(
    (story: WebStorySummary, railStories: WebStorySummary[]) => {
      const index = railStories.findIndex((s) => s.id === story.id);
      if (index < 0) return;
      navigation.navigate('WebStoryPlayer', { stories: railStories, index });
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Manual fallback for the "Load more news" footer button. Same guard as
  // handleEndReached; the button is a safety net in case FlatList's
  // onEndReached doesn't fire (heterogeneous item heights can confuse it).
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.screen}>
      <AnimatedTopBar
        onMeasure={setBrandInset}
        onMenuPress={useSideMenuStore.getState().open}
        onNotificationsPress={openNotifications}
        notifCount={notifCount}
      />

      {/* Sticky category dock. Lives outside AnimatedTopBar so it stays
          visible after the brand row collapses on scroll. zIndex sits
          between the brand row (10) and the list, matching the Forums
          sort-bar pattern. */}
      <Animated.View
        style={[styles.catDock, catDockStyle]}
        pointerEvents="box-none"
      >
        <View style={styles.catRowWrap} onLayout={onCatDockLayout}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
            style={styles.catScroll}
          >
            {NEWS_CATEGORIES.map((cat) => {
              const active = cat.id === selectedCategory;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.catTab, active && styles.catTabActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  accessibilityRole="button"
                  accessibilityLabel={cat.label}
                >
                  <Text style={[styles.catTabText, active && styles.catTabTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      {!isOnline ? (
        <Pressable style={styles.offlineBanner} onPress={() => refetch()}>
          <Text style={styles.offlineBannerText}>
            You're offline. Tap to retry.
          </Text>
        </Pressable>
      ) : null}

      {isLoading && items.length === 0 ? (
        // Only blank the screen for the *first* load. `keepPreviousData` on
        // the articles query already holds the previous category's items
        // visible during a tab swap, so once we've shown anything we never
        // re-show LoadingState.
        <LoadingState />
      ) : isError && items.length === 0 ? (
        <ErrorState
          message={
            isOnline
              ? 'Something went wrong. Please try again.'
              : "You're offline. Check your connection and try again."
          }
          onRetry={refetch}
        />
      ) : (
        <NewsFeedList
          items={items}
          topInset={totalInset}
          refreshing={refreshing}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onRefresh={handleRefresh}
          onEndReached={handleEndReached}
          onLoadMore={handleLoadMore}
          onArticlePress={handleArticlePress}
          onVideoPress={handleVideoPress}
          onGalleryPress={handleGalleryPress}
          onMoviePress={handleMoviePress}
          onStoryPress={handleStoryPress}
          onScroll={listScrollHandler}
        />
      )}

      <BrandRefreshIndicator refreshing={refreshing} topInset={totalInset} />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    // Sticky dock positioned absolutely above the FlatList. zIndex below
    // AnimatedTopBar (10) so the brand row covers it when both are visible,
    // and above the list so categories remain tappable while scrolling.
    //
    // The View's `backgroundColor` is critical: this dock's own height grows
    // and shrinks with the animated `paddingTop` (brandInset → safeTop), so
    // its View covers the entire band from the top of the screen down to the
    // bottom of the category row. Without a bg here, that paddingTop area is
    // transparent — and as the brand row fades to opacity 0 on scroll, the
    // FlatList content scrolling behind shows through the strip between the
    // status bar and the category row. Filling the whole View paints the
    // chrome surface for that band regardless of chromeProgress.
    catDock: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 5,
      backgroundColor: c.card,
    },
    catRowWrap: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    catScroll: {
      flexGrow: 0,
      backgroundColor: c.card,
    },
    catRow: {
      paddingHorizontal: 12,
      paddingVertical: 0,
      gap: 2,
    },
    catTab: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 2.5,
      borderBottomColor: 'transparent',
    },
    catTabActive: {
      borderBottomColor: c.primary,
    },
    catTabText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    catTabTextActive: {
      color: c.primary,
    },
    offlineBanner: {
      backgroundColor: c.dangerSoft,
      borderTopWidth: 1,
      borderTopColor: c.dangerSoftBorder,
      borderBottomWidth: 1,
      borderBottomColor: c.dangerSoftBorder,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    offlineBannerText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: c.danger,
      letterSpacing: 0.2,
    },
  });
}
