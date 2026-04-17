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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const queryCategory =
    selectedCategory === 'All' ? undefined : selectedCategory;

  const { data: banners = [], isLoading: bannersLoading } = useFeaturedBanners();
  const { data: articles = [], isLoading: articlesLoading } = useHomeArticles(queryCategory);

  const handleBannerPress = (banner: Banner) => {
    navigation.navigate('ArticleDetail', { id: banner.articleId });
  };

  const handleArticlePress = (article: Article) => {
    navigation.navigate('ArticleDetail', { id: article.id });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.brandText}>IndiaForums</Text>
        <View style={styles.topBarActions}>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={22} color="#1A1A1A" />
          </Pressable>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Menu"
            style={styles.iconButton}
          >
            <Ionicons name="menu-outline" size={24} color="#1A1A1A" />
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      <Pressable
        style={styles.searchBar}
        onPress={() => navigation.navigate('ArticleDetail', { id: '' })}
        accessibilityRole="search"
      >
        <Ionicons name="search-outline" size={16} color="#9E9E9E" />
        <Text style={styles.searchPlaceholder}>Search news, forums, celebs…</Text>
      </Pressable>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Featured banner carousel */}
        <View style={styles.carouselSection}>
          {bannersLoading ? (
            <LoadingState height={220} />
          ) : (
            <FeaturedBannerCarousel banners={banners} onPress={handleBannerPress} />
          )}
        </View>

        {/* Sticky category chips */}
        <View style={styles.stickyChips}>
          <CategoryChips
            categories={CATEGORIES}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </View>

        {/* Articles section */}
        <View style={styles.articlesSection}>
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
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3558F0',
    letterSpacing: -0.3,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F5F6F7',
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  searchPlaceholder: {
    fontSize: 13,
    color: '#9E9E9E',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  carouselSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 4,
  },
  stickyChips: {
    backgroundColor: '#FFFFFF',
  },
  articlesSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});
