import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
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
import { useFeaturedBanners, useHomeArticles } from '../hooks/useHomeData';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Banner, Article } from '../../../services/api';
import { GALLERIES } from '../data/galleries';
import { WEB_STORIES } from '../data/webStories';

const CATEGORIES = ['All', 'Television', 'Movies', 'Digital', 'Lifestyle', 'Sports'];
const PREVIEW_GALLERIES = GALLERIES.slice(0, 4);
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

  const handleGalleryPress = useCallback(
    (g: { id: number; title: string; count: number; emoji: string; bg: string }) =>
      navigation.navigate('GalleryDetail', {
        gallery: {
          id: g.id,
          title: g.title,
          pageUrl: null,
          cat: null,
          catLabel: null,
          count: g.count,
          emoji: g.emoji,
          bg: g.bg,
          time: '',
          featured: false,
          thumbnail: null,
          viewCount: 0,
          views: null,
        },
      }),
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
          <SectionHeader title="Latest News" />
          {articlesLoading ? <LoadingState height={300} /> : null}
        </View>
      </View>
    ),
    [banners, bannersLoading, selectedCategory, articlesLoading, handleBannerPress],
  );

  const ListFooter = useMemo(
    () => (
      <View>
        <View style={styles.sectionGap}>
          <PhotoGallerySection
            galleries={PREVIEW_GALLERIES}
            onSeeAll={handleGalleriesSeeAll}
            onGalleryPress={handleGalleryPress}
          />
        </View>

        <View style={styles.sectionGap}>
          <WebStoriesStrip stories={PREVIEW_WEB_STORIES} onSeeAll={() => {}} />
        </View>

        <View style={styles.sectionGap}>
          <ForumsSection />
        </View>

        <View style={styles.spacer} />
      </View>
    ),
    [handleGalleriesSeeAll, handleGalleryPress],
  );

  return (
    <View style={styles.screen}>
      <TopNavBrand onMenuPress={useSideMenuStore.getState().open} />

      <FlashList
        data={articlesLoading ? [] : articles}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.articlesBg}
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
