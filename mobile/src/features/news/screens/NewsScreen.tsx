import React, { useState, useCallback, useMemo } from 'react';
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
import { useSideMenuStore } from '../../../store/sideMenuStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
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
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNewsArticles(selectedCategory);

  const articles: Article[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Article[] = [];
    for (const page of data?.pages ?? []) {
      for (const a of page) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          out.push(a);
        }
      }
    }
    return out;
  }, [data]);

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat === 'All' ? undefined : cat);
  }, []);

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
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : null;

  const ListEmptyComponent =
    !isLoading ? (
      <ErrorState message="No articles found." />
    ) : null;

  return (
    <View style={styles.screen}>
      <TopNavBrand onMenuPress={useSideMenuStore.getState().open} />

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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.card,
    },
    chipScrollView: {
      flexGrow: 0,
      backgroundColor: c.card,
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
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textSecondary,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    footer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
  });
}
