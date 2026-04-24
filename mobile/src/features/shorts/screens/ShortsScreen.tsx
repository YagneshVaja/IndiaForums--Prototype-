import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import ErrorState from '../../../components/ui/ErrorState';
import { extractApiError, type Short } from '../../../services/api';

import ShortCard from '../components/ShortCard';
import ShortSkeleton from '../components/ShortSkeleton';
import ShortsCategoryBar from '../components/ShortsCategoryBar';
import YouTubePlayerModal from '../components/YouTubePlayerModal';
import { SHORTS_CATEGORIES, type ShortsCategory } from '../data/categories';
import { useShorts } from '../hooks/useShorts';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Shorts'>;

const CATEGORY_BAR_HEIGHT = 50;

export default function ShortsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeStore((s) => s.colors);

  const [activeCat, setActiveCat] = useState<ShortsCategory['id']>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const activeCategory =
    SHORTS_CATEGORIES.find((c) => c.id === activeCat) ?? SHORTS_CATEGORIES[0];

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useShorts(activeCategory.apiId);

  const shorts = useMemo<Short[]>(
    () => (data?.pages ?? []).flatMap((p) => p.shorts),
    [data],
  );

  // Use the server-reported total where available — stable denominator
  // that doesn't shift as pagination loads more items.
  const totalCount = data?.pages[0]?.pagination.totalCount ?? shorts.length;

  const listRef = useRef<FlatList<Short>>(null);

  // Reset on category change
  useEffect(() => {
    setActiveIndex(0);
    setHasScrolled(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeCat]);

  // Card dimensions — full viewport minus bottom tab bar
  const screenHeight = Dimensions.get('window').height;
  const cardHeight = Math.max(0, screenHeight - tabBarHeight);
  const topOffset = insets.top + CATEGORY_BAR_HEIGHT;

  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setActiveIndex(first.index);
        if (first.index > 0) setHasScrolled(true);
      }
    },
  );

  const handleAdvance = useCallback(() => {
    const next = activeIndex + 1;
    if (next < shorts.length) {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }
  }, [activeIndex, shorts.length]);

  const handleActivate = useCallback(
    (short: Short) => {
      switch (short.target.kind) {
        case 'youtube':
          setPlayingUrl(short.target.url);
          return;
        case 'article':
          navigation.navigate('ArticleDetail', {
            id: short.target.articleId,
            thumbnailUrl: short.thumbnail ?? undefined,
            title: short.title,
          });
          return;
        case 'gallery':
          navigation.navigate('GalleryDetail', {
            id: short.target.galleryId,
            title: short.title,
            thumbnail: short.thumbnail,
          });
          return;
        case 'external':
          Linking.openURL(short.target.url).catch(() => {});
          return;
      }
    },
    [navigation],
  );

  const modalOpen = playingUrl != null;

  const renderItem = useCallback(
    ({ item, index }: { item: Short; index: number }) => (
      <ShortCard
        short={item}
        isActive={index === activeIndex && !modalOpen}
        onAdvance={handleAdvance}
        onActivate={handleActivate}
        index={index}
        totalCount={totalCount}
        showHint={index === 0 && !hasScrolled && shorts.length > 1}
        height={cardHeight}
        topOffset={topOffset}
      />
    ),
    [
      activeIndex,
      modalOpen,
      totalCount,
      shorts.length,
      hasScrolled,
      handleAdvance,
      handleActivate,
      cardHeight,
      topOffset,
    ],
  );

  const keyExtractor = useCallback((s: Short) => String(s.id), []);

  const getItemLayout = useCallback(
    (_: ArrayLike<Short> | null | undefined, index: number) => ({
      length: cardHeight,
      offset: cardHeight * index,
      index,
    }),
    [cardHeight],
  );

  const isDark = colors.bg === '#0E0F12';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Content */}
      {isError && shorts.length === 0 ? (
        <View style={[styles.centered, { backgroundColor: colors.bg }]}>
          <ErrorState message={extractApiError(error, "Couldn't load shorts.")} onRetry={() => refetch()} />
        </View>
      ) : isLoading && shorts.length === 0 ? (
        <View style={{ height: cardHeight }}>
          <ShortSkeleton height={cardHeight} topOffset={topOffset} />
        </View>
      ) : shorts.length === 0 ? (
        <View style={[styles.centered, { backgroundColor: colors.bg }]}>
          <Text style={styles.emptyIcon}>⚡</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No shorts available
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Check back soon
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={shorts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          pagingEnabled
          snapToInterval={cardHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          viewabilityConfig={viewabilityConfigRef.current}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          removeClippedSubviews={false}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
        />
      )}

      {/* Category bar — anchored at top:0 and sized to cover both the
          status bar area (paddingTop = insets.top) AND the category row, so
          the translucent Android-15 status bar doesn't reveal card content
          underneath. Opaque backgroundColor is what prevents the leak. */}
      <View
        style={[
          styles.categoryBarHost,
          {
            paddingTop: insets.top,
            height: insets.top + CATEGORY_BAR_HEIGHT,
            backgroundColor: colors.bg,
          },
        ]}
      >
        <ShortsCategoryBar
          activeId={activeCat}
          onChange={setActiveCat}
          onBack={() => navigation.goBack()}
        />
      </View>

      <YouTubePlayerModal
        visible={playingUrl != null}
        url={playingUrl}
        onClose={() => setPlayingUrl(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
  },
  categoryBarHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 25,
  },
  footer: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
