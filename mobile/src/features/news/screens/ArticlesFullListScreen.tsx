import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NewsStackParamList } from '../../../navigation/types';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { useNewsArticles } from '../hooks/useNewsData';
import { useIsOnline } from '../../../hooks/useIsOnline';
import { NEWS_CATEGORIES, NEWS_SUBCATEGORIES } from '../data/newsStaticData';
import ArticleCard from '../../home/components/ArticleCard';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import type { Article } from '../../../services/api';

type Props = NativeStackScreenProps<NewsStackParamList, 'ArticlesFullList'>;

// Same auto-fetch cap as NewsMain — a sub-cat with zero matches in early pages
// can't loop through the entire archive before showing the empty state.
const MAX_AUTO_FETCH_PAGES = 4;

/**
 * Drill-in destination from the NewsMain "VIEW ALL NEWS" CTA. Pure article
 * infinite-scroll for the active filter — no hero card, no interleaved video
 * /quiz/gallery sections. The user came here to read more news; honor that.
 */
export default function ArticlesFullListScreen({ navigation, route }: Props) {
  const { category, subCat } = route.params;
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const isOnline = useIsOnline();
  const hasSubCatFilter = subCat !== 'all';

  const {
    data, isLoading, isError, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useNewsArticles(category, hasSubCatFilter);

  const articles: Article[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Article[] = [];
    for (const page of data?.pages ?? []) {
      for (const a of page) {
        if (!seen.has(a.id)) { seen.add(a.id); out.push(a); }
      }
    }
    return out;
  }, [data]);

  const usingHomeApi = category !== 'all' && subCat === 'all';

  const filteredArticles: Article[] = useMemo(() => {
    if (category === 'all') return articles;
    if (usingHomeApi) return articles;
    const subId = Number(subCat);
    return articles.filter((a) => a.catId === subId);
  }, [articles, category, subCat, usingHomeApi]);

  const loadedPages = data?.pages?.length ?? 0;
  const isScanning =
    filteredArticles.length === 0 &&
    articles.length > 0 &&
    hasNextPage &&
    loadedPages < MAX_AUTO_FETCH_PAGES;

  // Same auto-fetch behavior as NewsMain: rare sub-cats (TAMIL, KOREAN) might
  // not match anything on page 1, so chase a few pages before bailing.
  useEffect(() => {
    if (
      !isLoading &&
      !isFetchingNextPage &&
      hasNextPage &&
      articles.length > 0 &&
      filteredArticles.length === 0 &&
      loadedPages < MAX_AUTO_FETCH_PAGES
    ) {
      fetchNextPage();
    }
  }, [
    isLoading, isFetchingNextPage, hasNextPage,
    articles.length, filteredArticles.length, loadedPages, fetchNextPage,
  ]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      navigation.navigate('ArticleDetail', {
        id: article.id, thumbnailUrl: article.thumbnailUrl, title: article.title,
      });
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const title = useMemo(() => buildScreenTitle(category, subCat), [category, subCat]);

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleCard article={item} onPress={handleArticlePress} />
    ),
    [handleArticlePress],
  );

  const ListFooterComponent =
    isFetchingNextPage && filteredArticles.length > 0 ? (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : null;

  const ListEmptyComponent = !isOnline ? (
    <ErrorState
      message="You're offline. Check your connection and try again."
      onRetry={refetch}
    />
  ) : (
    <ErrorState message="No articles found in this category." />
  );

  return (
    <View style={styles.screen}>
      <TopNavBack title={title} onBack={() => navigation.goBack()} />

      {isLoading || isScanning ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message={
            isOnline
              ? 'Something went wrong. Please try again.'
              : "You're offline. Check your connection and try again."
          }
          onRetry={refetch}
        />
      ) : (
        <FlashList
          data={filteredArticles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

/** "All News" / "TV News" / "TV · Hindi" — derived from the route params. */
function buildScreenTitle(category: string, subCat: string): string {
  if (category === 'all') return 'All News';

  const parent = NEWS_CATEGORIES.find((c) => c.id === category);
  const parentLabel = parent?.label ?? category.toUpperCase();

  if (subCat === 'all') return `${parentLabel} News`;

  const sub = NEWS_SUBCATEGORIES[category]?.find((s) => s.id === subCat);
  const subLabel = sub?.label ?? subCat.toUpperCase();
  return `${parentLabel} · ${subLabel}`;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    listContent: {
      paddingVertical: 10,
    },
    footer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
  });
}
