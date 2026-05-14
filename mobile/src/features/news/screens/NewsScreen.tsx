import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useAnimatedScrollHandler } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NewsStackParamList } from '../../../navigation/types';
import AnimatedTopBar from '../../../components/layout/chromeScroll/AnimatedTopBar';
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
import type { Article, Gallery, Movie, Video } from '../../../services/api';

type Props = NativeStackScreenProps<NewsStackParamList, 'NewsMain'>;

export default function NewsScreen({ navigation, route }: Props) {
  // Home's "View all" pill passes initialCategory so the News tab opens
  // pre-filtered to whatever chip was active on Home.
  const initialCategory = route.params?.initialCategory ?? 'all';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  useEffect(() => {
    const next = route.params?.initialCategory;
    if (next && next !== selectedCategory) {
      setSelectedCategory(next);
    }
    // One-shot sync on param change — not a feedback loop on local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.initialCategory]);

  const styles = useThemedStyles(makeStyles);

  // Match the Forums AllTopicsView pattern exactly: pull `applyScroll` from
  // useScrollChrome and build a fresh `useAnimatedScrollHandler` here, rather
  // than using the prebuilt `scrollHandler`. Same chrome behaviour, but this
  // is the proven-working combination with Animated.FlatList + onEndReached.
  const { applyScroll: applyChromeScroll, resetChrome } = useScrollChrome();
  const listScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyChromeScroll(e);
    },
  });
  const [topInset, setTopInset] = useState(0);
  const { notifCount, openNotifications } = useNotificationBell();

  useFocusEffect(
    useCallback(() => {
      resetChrome();
    }, [resetChrome]),
  );

  const isOnline = useIsOnline();
  const {
    items,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNewsFeed(selectedCategory);

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
    (movie: Movie) => navigation.navigate('MovieDetail', { movie }),
    [navigation],
  );

  // Visual stories on this feed are static placeholder tiles (see
  // VISUAL_STORIES in newsStaticData) — they don't carry real
  // WebStorySummary ids, so they can't drive WebStoryPlayer directly.
  // Tap navigates to the WebStories listing where real, playable stories
  // live.
  const handleStoryPress = useCallback(
    () => navigation.navigate('WebStories'),
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
        onMeasure={setTopInset}
        onMenuPress={useSideMenuStore.getState().open}
        onNotificationsPress={openNotifications}
        notifCount={notifCount}
      >
        {/* Category tabs only — sub-chips were dropped in the redesign. The
            interleaved feed favours one continuous filter axis; rare-language
            filters (TAMIL, KOREAN, …) remain reachable via the legacy
            ArticlesFullList screen for now. */}
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
      </AnimatedTopBar>

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
        // re-show LoadingState — that's what was causing the flicker on
        // rapid category taps.
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
          topInset={topInset}
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

      <BrandRefreshIndicator refreshing={refreshing} topInset={topInset} />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    catScroll: {
      flexGrow: 0,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
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
