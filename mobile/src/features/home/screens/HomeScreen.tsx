import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../../components/ui/ScreenWrapper';
import SectionHeader from '../../../components/ui/SectionHeader';
import LoadingState from '../../../components/ui/LoadingState';
import FeaturedBannerCarousel from '../components/FeaturedBannerCarousel';
import CategoryChips from '../components/CategoryChips';
import ArticleCard from '../components/ArticleCard';
import { useFeaturedBanners, useHomeArticles } from '../hooks/useHomeData';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Banner, Article } from '../../../services/api';

const CATEGORIES = [
  'All',
  'Bollywood',
  'Cricket',
  'Politics',
  'Tech',
  'Sports',
  'Entertainment',
];

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const queryCategory =
    selectedCategory === 'All' ? undefined : selectedCategory;

  const {
    data: banners = [],
    isLoading: bannersLoading,
  } = useFeaturedBanners();

  const {
    data: articles = [],
    isLoading: articlesLoading,
  } = useHomeArticles(queryCategory);

  const handleBannerPress = (banner: Banner) => {
    navigation.navigate('ArticleDetail', { id: banner.articleId });
  };

  const handleArticlePress = (article: Article) => {
    navigation.navigate('ArticleDetail', { id: article.id });
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.brandText}>IndiaForums</Text>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => {
              // Notifications screen wired in MySpace stack; no-op here for now
            }}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#1A1A1A"
            />
          </Pressable>
        </View>

        {/* Featured banner carousel */}
        {bannersLoading ? (
          <LoadingState height={200} />
        ) : (
          <FeaturedBannerCarousel
            banners={banners}
            onPress={handleBannerPress}
          />
        )}

        {/* Category filter chips */}
        <CategoryChips
          categories={CATEGORIES}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Articles section */}
        <SectionHeader title="Latest News" />
        {articlesLoading ? (
          <LoadingState height={300} />
        ) : (
          articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onPress={handleArticlePress}
            />
          ))
        )}

        {/* Bottom padding */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3558F0',
  },
  bottomSpacer: {
    height: 24,
  },
});
