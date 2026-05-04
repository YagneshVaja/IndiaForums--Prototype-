import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TopNavBrand } from '../../../components/layout/TopNavBar';
import { useSideMenuStore } from '../../../store/sideMenuStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import SectionHeader from '../../../components/ui/SectionHeader';
import LoadingState from '../../../components/ui/LoadingState';
import FeaturedBannerCarousel from '../components/FeaturedBannerCarousel';
import CategoryChips from '../components/CategoryChips';
import ArticleCard from '../components/ArticleCard';
import StoriesStrip from '../components/StoriesStrip';
import PhotoGallerySection from '../components/PhotoGallerySection';
import WebStoriesStrip from '../components/WebStoriesStrip';
import ForumsSection from '../components/ForumsSection';
import ChannelsSection from '../components/ChannelsSection';
import { useFeaturedBanners, useHomeArticles } from '../hooks/useHomeData';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Banner, Article, ForumTopic, Gallery } from '../../../services/api';
import { WEB_STORIES } from '../data/webStories';

const CATEGORIES = ['All', 'Television', 'Movies', 'Digital', 'Lifestyle', 'Sports'];
const PREVIEW_WEB_STORIES = WEB_STORIES.slice(0, 8);

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const keyExtractor = (article: Article) => article.id;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    if (selectedCategory === 'All') return articles;
    return articles.map((a) => ({ ...a, category: selectedCategory }));
  }, [articles, selectedCategory]);

  // Pull-to-refresh: invalidate all home-relevant query keys in one shot. The
  // local `refreshing` flag drives the spinner because some sections own their
  // own queries (ForumsSection → 'home-forum-topics') and aren't observable
  // from this component, so we can't rely on a single hook's `isRefetching`.
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['banners'] }),
        queryClient.invalidateQueries({ queryKey: ['articles'] }),
        queryClient.invalidateQueries({ queryKey: ['home-forum-topics'] }),
        queryClient.invalidateQueries({ queryKey: ['home-media-galleries'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

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
          <SectionHeader title="Trending Now" />
          {bannersLoading ? (
            <LoadingState height={180} />
          ) : (
            <FeaturedBannerCarousel banners={banners} onPress={handleBannerPress} />
          )}
        </View>

        <View style={styles.chipsWrap}>
          <CategoryChips
            categories={CATEGORIES}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </View>

        <View style={styles.articlesTop}>
          <SectionHeader
            title="Latest News"
            actionLabel="View all"
            onAction={handleNewsViewAll}
          />
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
          <WebStoriesStrip stories={PREVIEW_WEB_STORIES} onSeeAll={() => {}} />
        </View>

        <View style={styles.spacer} />
      </View>
    ),
    [styles, handleGalleriesSeeAll, handleGalleryPress, handleTopicPress],
  );

  return (
    <View style={styles.screen}>
      <TopNavBrand onMenuPress={useSideMenuStore.getState().open} />

      <FlashList
        data={articlesLoading ? [] : displayArticles}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.articlesBg}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
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
      marginTop: 8,
    },
    spacer: { height: 32 },
  });
}
