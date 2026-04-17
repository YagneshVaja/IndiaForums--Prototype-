import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NewsStackParamList } from '../../../navigation/types';
import { TopNavBrand } from '../../../components/layout/TopNavBar';
import { useNewsArticles } from '../hooks/useNewsData';
import ArticleCard from '../../home/components/ArticleCard';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import type { Article } from '../../../services/api';

type Props = NativeStackScreenProps<NewsStackParamList, 'NewsMain'>;

const CATEGORIES = ['All', 'Bollywood', 'Cricket', 'Politics', 'Tech', 'Sports'];

export default function NewsScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNewsArticles(selectedCategory);

  const articles: Article[] = data?.pages.flatMap((p) => p) ?? [];

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat === 'All' ? undefined : cat);
  }, []);

  const handleArticlePress = useCallback(
    (article: Article) => {
      navigation.navigate('ArticleDetail', { id: article.id });
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard article={item} onPress={handleArticlePress} />
    ),
    [handleArticlePress],
  );

  const ListFooterComponent = isFetchingNextPage ? (
    <View style={styles.footer}>
      <ActivityIndicator size="small" color="#3558F0" />
    </View>
  ) : null;

  const ListEmptyComponent =
    !isLoading ? (
      <ErrorState message="No articles found." />
    ) : null;

  return (
    <View style={styles.screen}>
      <TopNavBrand />

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScrollView}
      >
        {CATEGORIES.map((cat) => {
          const isActive =
            cat === 'All' ? selectedCategory === undefined : selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handleCategorySelect(cat)}
              accessibilityRole="button"
              accessibilityLabel={cat}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlashList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chipScrollView: {
    flexGrow: 0,
    backgroundColor: '#FFFFFF',
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F6F7',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chipActive: {
    backgroundColor: '#3558F0',
    borderColor: '#3558F0',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
