import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated from 'react-native-reanimated';
import AnimatedTopBar from '../../../components/layout/chromeScroll/AnimatedTopBar';
import { useNotificationBell } from '../../notifications/hooks/useNotificationBell';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';
import { useSideMenuStore } from '../../../store/sideMenuStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import LoadingState from '../../../components/ui/LoadingState';
import BrandPullToRefresh from '../../../components/ui/BrandPullToRefresh';
import FeaturedBannerCarousel from '../components/FeaturedBannerCarousel';
import CategoryChips from '../components/CategoryChips';
import ArticleCard from '../components/ArticleCard';
import StoriesStrip from '../components/StoriesStrip';
import PhotoGallerySection from '../components/PhotoGallerySection';
import WebStoriesHomeSection from '../components/WebStoriesHomeSection';
import LatestMoviesHomeSection from '../components/LatestMoviesHomeSection';
import CelebrityRankingHomeSection from '../components/CelebrityRankingHomeSection';
import ForumsSection from '../components/ForumsSection';
import ChannelsSection from '../components/ChannelsSection';
import VideosHomeSection from '../components/VideosHomeSection';
import QuizzesHomeSection from '../components/QuizzesHomeSection';
import { useFeaturedBanners, useHomeArticles } from '../hooks/useHomeData';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Banner, Article, ForumTopic, Gallery } from '../../../services/api';

const CATEGORIES = ['All', 'Television', 'Movies', 'Digital', 'Lifestyle', 'Sports'];

// Cap the homepage's Latest News list at 12 articles before handing off to the
// News tab via the bottom VIEW ALL CTA. Mirrors the website's 3×4 = 12 tile
// grid and gives the user a clear stopping point instead of scrolling through
// every article on the home page.
const HOME_NEWS_PREVIEW = 12;

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const keyExtractor = (article: Article) => article.id;

// MUST be at module scope — defining inside the component would recreate the
// wrapper on every render and FlashList would lose its list state.
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as unknown as typeof FlashList;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { scrollHandler, resetChrome, scrollY } = useScrollChrome();
  const [topInset, setTopInset] = useState(0);
  const { notifCount, openNotifications } = useNotificationBell();

  useFocusEffect(
    useCallback(() => {
      resetChrome();
    }, [resetChrome]),
  );

  const queryCategory = selectedCategory === 'All' ? undefined : selectedCategory;
  const { data: banners = [], isLoading: bannersLoading } = useFeaturedBanners();
  const { data: articles = [], isLoading: articlesLoading } = useHomeArticles(queryCategory);

  // /home/articles often returns empty sectionName, which makes
  // transformHomeArticle default category to "Movies". When the user has a
  // chip selected, that lie is jarring — every Television article shows a
  // MOVIES badge. Override the displayed category to match the active chip
  // so the badge mirrors the user's filter intent. "All" leaves the per-
  // article category alone.
  const displayArticles = useMemo<Article[]>(() => {
    const overridden = selectedCategory === 'All'
      ? articles
      : articles.map((a) => ({ ...a, category: selectedCategory }));
    return overridden.slice(0, HOME_NEWS_PREVIEW);
  }, [articles, selectedCategory]);

  // Whether to show the VIEW ALL pill — only when we actually capped the list.
  // A category that returned 8 articles wouldn't grow on the destination, so
  // hide the CTA to keep the user from drilling into a screen that mirrors
  // what they're already looking at.
  const hasMoreNews = articles.length > HOME_NEWS_PREVIEW;

  // Pull-to-refresh: invalidate all home-relevant query keys in one shot. The
  // local `refreshing` flag drives the spinner because some sections own their
  // own queries (ForumsSection → 'home-forum-topics') and aren't observable
  // from this component, so we can't rely on a single hook's `isRefetching`.
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    resetChrome();
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['banners'] }),
        queryClient.invalidateQueries({ queryKey: ['articles'] }),
        queryClient.invalidateQueries({ queryKey: ['home-forum-topics'] }),
        queryClient.invalidateQueries({ queryKey: ['home-media-galleries'] }),
        queryClient.invalidateQueries({ queryKey: ['videos'] }),
        queryClient.invalidateQueries({ queryKey: ['quizzes'] }),
        queryClient.invalidateQueries({ queryKey: ['webstories'] }),
        queryClient.invalidateQueries({ queryKey: ['movies'] }),
        queryClient.invalidateQueries({ queryKey: ['celebrities'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, resetChrome]);

  const handleBannerPress = useCallback(
    (banner: Banner) => {
      navigation.navigate('ArticleDetail', {
        id: banner.articleId,
        thumbnailUrl: banner.imageUrl,
        title: banner.title,
      });
    },
    [navigation],
  );

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

  const handleGalleriesSeeAll = useCallback(
    () => navigation.navigate('Galleries'),
    [navigation],
  );

  // Cross-tab jump: HomeStack → MainTab parent → News tab. Lowercased category
  // matches NEWS_CATEGORIES ids ('all' | 'television' | 'movies' | ...).
  const handleNewsViewAll = useCallback(() => {
    navigation.getParent()?.navigate('News', {
      screen: 'NewsMain',
      params: { initialCategory: selectedCategory.toLowerCase() },
    });
  }, [navigation, selectedCategory]);

  // TopicDetail is registered in HomeStack itself, so push within the stack
  // — back gesture returns to Home rather than dropping the user into the
  // Forums tab.
  const handleTopicPress = useCallback(
    (topic: ForumTopic) => {
      navigation.navigate('TopicDetail', { topic });
    },
    [navigation],
  );

  const handleGalleryPress = useCallback(
    (gallery: Gallery) => navigation.navigate('GalleryDetail', { gallery }),
    [navigation],
  );

  // Uniform compact rows — every article uses the same left-thumb / right-body
  // ArticleCard so the 12-headline preview reads as a clean scannable list,
  // not a hero + tail. Mirrors the look you saw on the bottom rows.
  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard article={item} onPress={handleArticlePress} />
    ),
    [handleArticlePress],
  );

  const ListHeader = useMemo(
    () => (
      <View>
        <View style={styles.storiesWrap}>
          <StoriesStrip />
        </View>

        <View style={styles.carouselWrap}>
          {/* Trending Now header — same accent-bar pattern as every other
              section so the screen reads as a single designed surface. No
              See All; banners aren't a list with a destination. */}
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <View style={styles.accentBar} />
              <View style={styles.titleCol}>
                <Text style={styles.sectionTitle}>TRENDING NOW</Text>
                <Text style={styles.sectionSubtitle}>Top stories of the day</Text>
              </View>
            </View>
          </View>
          {bannersLoading ? (
            <LoadingState height={180} />
          ) : (
            <FeaturedBannerCarousel banners={banners} onPress={handleBannerPress} />
          )}
        </View>

        <View style={styles.articlesTop}>
          {/* Latest News header — same accent-bar pattern as every other
              section. The bottom VIEW ALL pill remains as a stronger CTA
              after the user has scanned the 12-headline preview. */}
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <View style={styles.accentBar} />
              <View style={styles.titleCol}>
                <Text style={styles.sectionTitle}>LATEST NEWS</Text>
                <Text style={styles.sectionSubtitle}>Headlines · tap to read</Text>
              </View>
            </View>
            <Pressable
              onPress={handleNewsViewAll}
              style={({ pressed }) => [
                styles.seeAll,
                pressed && styles.seeAllPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="See all news"
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </Pressable>
          </View>

          {/* Category chips belong *inside* the Latest News section — they
              filter articles only, not the Trending Now carousel above. */}
          <View style={styles.chipsWrap}>
            <CategoryChips
              categories={CATEGORIES}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>

          {articlesLoading ? <LoadingState height={300} /> : null}
        </View>
      </View>
    ),
    [
      styles,
      banners,
      bannersLoading,
      selectedCategory,
      articlesLoading,
      handleBannerPress,
      handleNewsViewAll,
    ],
  );

  const ListFooter = useMemo(
    () => (
      <View>
        {/* End-of-news divider — visually attributes the pill (or empty
            spacer) to the Latest News block above so it doesn't read as
            floating between sections. */}
        <View style={styles.newsListDivider} />

        {/* VIEW ALL NEWS pill — sits directly under the 12-article preview so
            the user always reaches a clear stopping point and can drill into
            the dedicated News tab for the active category filter. When the
            list isn't capped we render a small spacer instead so the article
            list doesn't slam into the next section. */}
        {hasMoreNews ? (
          <Pressable
            style={({ pressed }) => [
              styles.viewAllPill,
              pressed && styles.viewAllPillPressed,
            ]}
            onPress={handleNewsViewAll}
            accessibilityRole="button"
            accessibilityLabel="View all news"
          >
            <Text style={styles.viewAllPillText}>View all news</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.newsListGap} />
        )}

        <View style={styles.sectionGap}>
          <ForumsSection onTopicPress={handleTopicPress} />
        </View>

        <View style={styles.sectionGap}>
          <PhotoGallerySection
            onSeeAll={handleGalleriesSeeAll}
            onGalleryPress={handleGalleryPress}
          />
        </View>

        <View style={styles.sectionGap}>
          <ChannelsSection />
        </View>

        <View style={styles.sectionGap}>
          <VideosHomeSection />
        </View>

        <View style={styles.sectionGap}>
          <QuizzesHomeSection />
        </View>

        <View style={styles.sectionGap}>
          <WebStoriesHomeSection />
        </View>

        <View style={styles.sectionGap}>
          <LatestMoviesHomeSection />
        </View>

        <View style={styles.sectionGap}>
          <CelebrityRankingHomeSection />
        </View>

        <View style={styles.spacer} />
      </View>
    ),
    [
      styles,
      colors.primary,
      hasMoreNews,
      handleNewsViewAll,
      handleGalleriesSeeAll,
      handleGalleryPress,
      handleTopicPress,
    ],
  );

  return (
    <View style={styles.screen}>
      <AnimatedTopBar
        onMenuPress={useSideMenuStore.getState().open}
        onNotificationsPress={openNotifications}
        notifCount={notifCount}
        onMeasure={setTopInset}
      />

      <BrandPullToRefresh
        refreshing={refreshing}
        onRefresh={handleRefresh}
        topInset={topInset}
        scrollY={scrollY}
      >
        <AnimatedFlashList
          data={articlesLoading ? [] : displayArticles}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          contentContainerStyle={{ ...styles.articlesBg, paddingTop: topInset }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onScroll={scrollHandler as any}
          scrollEventThrottle={16}
          overScrollMode="never"
          bounces={false}
        />
      </BrandPullToRefresh>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    storiesWrap: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    carouselWrap: {
      backgroundColor: c.card,
      paddingBottom: 8,
    },
    chipsWrap: {
      backgroundColor: c.card,
    },
    articlesTop: {
      backgroundColor: c.card,
      marginTop: 8,
    },
    articlesBg: {
      backgroundColor: c.card,
    },
    sectionGap: {
      marginTop: 12,
    },
    spacer: { height: 32 },
    // Filler when the news list isn't capped — keeps a minimum gap between
    // the last ArticleCard and the next section's borderTop so the seam
    // isn't visually tight.
    newsListGap: {
      height: 16,
    },
    // Subtle 1-px line that closes off the news block before the pill or
    // the empty-state spacer below it.
    newsListDivider: {
      height: 1,
      backgroundColor: c.border,
      marginHorizontal: 14,
    },

    // Shared Home section header — used by Trending Now and Latest News
    // inline blocks. Mirrors the accent-bar pattern in every other Home
    // section so the screen reads as one designed surface.
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 16,
      paddingBottom: 14,
      gap: 10,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    accentBar: {
      width: 3.5,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    titleCol: {
      flex: 1,
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    sectionSubtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    seeAllPressed: {
      opacity: 0.6,
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },

    // VIEW ALL NEWS — minimal outlined pill. Centered text + arrow against
    // a soft primary tint. Sized to feel like a section action, not a hero
    // CTA, so it sits naturally between the article list and the next
    // section without dominating the screen.
    viewAllPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 4,
      paddingVertical: 10,
      paddingHorizontal: 22,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
    },
    viewAllPillPressed: {
      opacity: 0.7,
    },
    viewAllPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },
  });
}
