import React, { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { Article, Gallery, Movie, Video } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import NewsHeroCard from './NewsHeroCard';
import ArticleCard from '../../home/components/ArticleCard';
import NewsVideoSection from './NewsVideoSection';
import NewsVisualStoriesSection from './NewsVisualStoriesSection';
import NewsQuizSection from './NewsQuizSection';
import NewsGallerySection from './NewsGallerySection';
import NewsMoviesSection from './NewsMoviesSection';
import type { FeedItem } from '../utils/assembleNewsFeed';

interface Props {
  items: FeedItem[];
  topInset: number;
  refreshing: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;

  onRefresh: () => void;
  onEndReached: () => void;
  onLoadMore: () => void;
  onArticlePress: (article: Article) => void;
  onVideoPress?: (video: Video) => void;
  onGalleryPress?: (gallery: Gallery) => void;
  onMoviePress?: (movie: Movie) => void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onScroll: any;
}

const keyExtractor = (item: FeedItem) => item.key;

// FlatList (via Animated.FlatList) — same combination Forums' AllTopicsView
// uses for its proven infinite scroll. We also surface an explicit "Load
// more" button in the footer as a manual fallback so the user can advance
// pagination even if onEndReached fails to fire for any reason.
export default function NewsFeedList({
  items,
  topInset,
  refreshing,
  hasNextPage,
  isFetchingNextPage,
  onRefresh,
  onEndReached,
  onLoadMore,
  onArticlePress,
  onVideoPress,
  onGalleryPress,
  onMoviePress,
  onScroll,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const tabBarHeight = useBottomTabBarHeight();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FeedItem>) => {
      switch (item.kind) {
        case 'hero-article':
          return <NewsHeroCard article={item.article} onPress={onArticlePress} />;
        case 'compact-article':
          return <ArticleCard article={item.article} onPress={onArticlePress} />;
        case 'rail-videos':
          return (
            <NewsVideoSection
              videos={item.videos}
              onVideoPress={onVideoPress}
            />
          );
        case 'rail-stories':
          return <NewsVisualStoriesSection stories={item.stories} />;
        case 'card-quiz':
          return <NewsQuizSection quiz={item.quiz} />;
        case 'rail-photos':
          return (
            <NewsGallerySection
              galleries={item.galleries}
              onGalleryPress={onGalleryPress}
            />
          );
        case 'rail-movies':
          return (
            <NewsMoviesSection
              movies={item.movies}
              onMoviePress={onMoviePress}
            />
          );
      }
    },
    [onArticlePress, onVideoPress, onGalleryPress, onMoviePress],
  );

  // Footer:
  //   • While fetching next page → spinner.
  //   • API still has more (hasNextPage) but no fetch in flight → explicit
  //     "Load more news" button. Belt-and-suspenders for cases where
  //     onEndReached doesn't fire reliably (FlatList virtualization can be
  //     finicky with heterogeneous item heights). User can always tap to
  //     advance pagination manually.
  //   • API exhausted → "You're all caught up" marker.
  //
  // Built via useMemo (returning an element) instead of useCallback
  // (returning a component). FlatList treats every fresh component
  // reference as a new ListFooterComponent and re-mounts it; an element
  // reference is mounted once and only re-renders when its content changes.
  const listFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" />
          <Text style={styles.footerLoadingText}>Loading more…</Text>
        </View>
      );
    }
    if (hasNextPage && items.length > 0) {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.loadMoreBtn,
            pressed && styles.loadMoreBtnPressed,
          ]}
          onPress={onLoadMore}
          accessibilityRole="button"
          accessibilityLabel="Load more news"
        >
          <Text style={styles.loadMoreText}>Load more news</Text>
          <Ionicons name="arrow-down" size={15} />
        </Pressable>
      );
    }
    if (!hasNextPage && items.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Ionicons name="checkmark-done-outline" size={16} />
          <Text style={styles.footerEndText}>You're all caught up</Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, items.length, onLoadMore, styles]);

  return (
    <Animated.FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListFooterComponent={listFooter}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: topInset,
        // Leave space for the bottom tab bar so the footer (spinner / Load
        // more button / "all caught up") is fully visible above it.
        paddingBottom: tabBarHeight + 24,
      }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      // Heterogeneous heights (compact rows ~80px, hero ~300px, quiz ~400px)
      // mean a smaller render window keeps memory and JS-thread mount work
      // low while still pre-rendering enough margin to keep scroll smooth.
      // Numbers picked to match what TOI / News18 ship in production after
      // performance tuning their interleaved feeds.
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      updateCellsBatchingPeriod={60}
      // Android-only optimisation: drops off-screen native views from the
      // window manager, freeing the underlying memory until they scroll
      // back in. Big win for long news feeds. iOS handles this internally.
      removeClippedSubviews={Platform.OS === 'android'}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          // OS spinner hidden — BrandRefreshIndicator paints on top while
          // RefreshControl still owns the gesture/threshold.
          tintColor="transparent"
          colors={['transparent']}
          progressBackgroundColor="transparent"
          progressViewOffset={topInset}
        />
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    footerLoading: {
      paddingVertical: 18,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerLoadingText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.3,
    },
    loadMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      alignSelf: 'center',
      marginTop: 14,
      marginBottom: 4,
      paddingVertical: 12,
      paddingHorizontal: 26,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
    },
    loadMoreBtnPressed: {
      opacity: 0.7,
    },
    loadMoreText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },
    footerEnd: {
      paddingVertical: 24,
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerEndText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.3,
    },
  });
}
