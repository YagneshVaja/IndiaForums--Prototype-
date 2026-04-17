import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TopNavBrand } from '../../../components/layout/TopNavBar';
import SectionHeader from '../../../components/ui/SectionHeader';
import LoadingState from '../../../components/ui/LoadingState';
import FeaturedBannerCarousel from '../components/FeaturedBannerCarousel';
import CategoryChips from '../components/CategoryChips';
import ArticleCard from '../components/ArticleCard';
import { useFeaturedBanners, useHomeArticles } from '../hooks/useHomeData';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Banner, Article } from '../../../services/api';

const CATEGORIES = ['All', 'Bollywood', 'Cricket', 'Politics', 'Tech', 'Sports', 'Entertainment'];

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const queryCategory = selectedCategory === 'All' ? undefined : selectedCategory;
  const { data: banners = [], isLoading: bannersLoading } = useFeaturedBanners();
  const { data: articles = [], isLoading: articlesLoading } = useHomeArticles(queryCategory);

  const handleBannerPress = (banner: Banner) => {
    navigation.navigate('ArticleDetail', { id: banner.articleId });
  };

  const handleArticlePress = (article: Article) => {
    navigation.navigate('ArticleDetail', { id: article.id });
  };

  return (
    <View style={styles.screen}>
      <TopNavBrand />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Featured carousel */}
        <View style={styles.carouselWrap}>
          <SectionHeader title="Trending Now" />
          {bannersLoading ? (
            <LoadingState height={180} />
          ) : (
            <FeaturedBannerCarousel banners={banners} onPress={handleBannerPress} />
          )}
        </View>

        {/* Sticky category chips */}
        <View style={styles.chipsWrap}>
          <CategoryChips
            categories={CATEGORIES}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </View>

        {/* Article list */}
        <View style={styles.articlesWrap}>
          <SectionHeader title="Latest News" />
          {articlesLoading ? (
            <LoadingState height={300} />
          ) : (
            articles.map((article) => (
              <ArticleCard key={article.id} article={article} onPress={handleArticlePress} />
            ))
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  scroll: {
    flex: 1,
  },
  carouselWrap: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
  },
  chipsWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  articlesWrap: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  spacer: { height: 32 },
});
