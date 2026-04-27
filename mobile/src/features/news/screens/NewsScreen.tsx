import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useNewsArticles, useNewsVideos, useNewsGalleries } from '../hooks/useNewsData';
import { useIsOnline } from '../../../hooks/useIsOnline';
import {
  NEWS_CATEGORIES,
  NEWS_SUBCATEGORIES,
  QUIZZES,
  VISUAL_STORIES,
} from '../data/newsStaticData';
import ArticleCard from '../../home/components/ArticleCard';
import NewsHeroCard from '../components/NewsHeroCard';
import NewsVideoSection from '../components/NewsVideoSection';
import NewsQuizSection from '../components/NewsQuizSection';
import NewsGallerySection from '../components/NewsGallerySection';
import NewsVisualStoriesSection from '../components/NewsVisualStoriesSection';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import type { Article, Video, Gallery } from '../../../services/api';

type Props = NativeStackScreenProps<NewsStackParamList, 'NewsMain'>;

const BATCH_SIZE = 4;
// Sub-cat scan (e.g. TAMIL, KOREAN) auto-fetches additional pages of /articles/list
// when the current pages contain no matches. Cap so a sub-cat with zero articles
// can't loop through the entire archive — show empty state once the cap is hit.
const MAX_AUTO_FETCH_PAGES = 4;
const SECTION_CYCLE = ['videos', 'quiz', 'photos', 'stories'] as const;
type SectionType = typeof SECTION_CYCLE[number];

type FeedItem =
  | { type: 'article_hero';    key: string; data: Article }
  | { type: 'article_compact'; key: string; data: Article }
  | { type: 'video_section';   key: string; pageIdx: number }
  | { type: 'quiz_section';    key: string; quizIdx: number }
  | { type: 'gallery_section'; key: string; pageIdx: number }
  | { type: 'story_section';   key: string; pageIdx: number };

function buildFeed(articles: Article[]): FeedItem[] {
  const items: FeedItem[] = [];
  const pageCounts: Record<SectionType, number> = { videos: 0, quiz: 0, photos: 0, stories: 0 };
  let cycleIdx = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) break;

    const chunkIdx = Math.floor(i / BATCH_SIZE);

    batch.forEach((a, j) => {
      // Mirror prototype: first chunk → j=0 is hero; later chunks → j=2 is hero
      const isHero = (chunkIdx === 0 && j === 0) || (chunkIdx > 0 && j === 2);
      items.push({
        type: isHero ? 'article_hero' : 'article_compact',
        key:  `article-${a.id}-${i + j}`,
        data: a,
      });
    });

    const sType = SECTION_CYCLE[cycleIdx % SECTION_CYCLE.length];
    const pIdx  = pageCounts[sType];
    switch (sType) {
      case 'videos':
        items.push({ type: 'video_section',   key: `videos-${chunkIdx}`,   pageIdx: pIdx });
        break;
      case 'quiz':
        items.push({ type: 'quiz_section',    key: `quiz-${chunkIdx}`,     quizIdx: pIdx });
        break;
      case 'photos':
        items.push({ type: 'gallery_section', key: `gallery-${chunkIdx}`,  pageIdx: pIdx });
        break;
      case 'stories':
        items.push({ type: 'story_section',   key: `stories-${chunkIdx}`,  pageIdx: pIdx });
        break;
    }
    pageCounts[sType]++;
    cycleIdx++;
  }

  return items;
}

function getItemType(item: FeedItem): string {
  return item.type;
}

export default function NewsScreen({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCat,   setSelectedSubCat]   = useState('all');
  const colors = useThemeStore((s) => s.colors);
  const styles  = useMemo(() => makeStyles(colors), [colors]);

  // /home/articles filters server-side, so when only a parent category is
  // active (sub=ALL), we use that endpoint and skip the catId filter below.
  const usingHomeApi = selectedCategory !== 'all' && selectedSubCat === 'all';

  const isOnline = useIsOnline();

  const {
    data, isLoading, isError, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useNewsArticles(selectedCategory, selectedSubCat !== 'all');

  const { data: videos = [] }    = useNewsVideos();
  const { data: galleries = [] } = useNewsGalleries();

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

  const subCats = useMemo(
    () => NEWS_SUBCATEGORIES[selectedCategory] ?? [],
    [selectedCategory],
  );

  // Filter hierarchy matches the web prototype's NewsScreen:
  //   ALL                → no filter (uses /articles/list, no server filter)
  //   parent, subcat=ALL → server-filtered via /home/articles, no client filter
  //   parent + subcat    → uses /articles/list, filter by catId === subId
  const filteredArticles: Article[] = useMemo(() => {
    if (selectedCategory === 'all') return articles;
    if (usingHomeApi) return articles;

    const subId = Number(selectedSubCat);
    return articles.filter((a) => a.catId === subId);
  }, [articles, selectedCategory, selectedSubCat, usingHomeApi]);

  const feedItems: FeedItem[] = useMemo(() => buildFeed(filteredArticles), [filteredArticles]);

  // True while the auto-fetch effect is hunting through pages for sub-cat
  // matches. We treat this whole window as "loading" so the user doesn't
  // briefly see "No articles found" + a footer spinner side-by-side between
  // page fetches. Goes false once a match is found OR the page cap is hit.
  const loadedPages = data?.pages?.length ?? 0;
  const isScanning =
    filteredArticles.length === 0 &&
    articles.length > 0 &&
    hasNextPage &&
    loadedPages < MAX_AUTO_FETCH_PAGES;

  const handleCategorySelect = useCallback((id: string) => {
    setSelectedCategory(id);
    setSelectedSubCat('all');
  }, []);

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

  // If the current sub-cat filter yields 0 matches but more pages are
  // available, auto-fetch so a rare sub-chip (e.g. TAMIL, KOREAN) doesn't
  // strand the user on an empty screen when the first page happens to have
  // no matches. Capped at MAX_AUTO_FETCH_PAGES so an empty sub-cat can't
  // chain-fetch the entire archive.
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
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    articles.length,
    filteredArticles.length,
    loadedPages,
    fetchNextPage,
  ]);

  // Slice videos into pages of 4, cycling
  const videoPool = videos.length > 0 ? videos : [];
  function getVideoPage(pageIdx: number): Video[] {
    if (videoPool.length === 0) return [];
    const start = (pageIdx * 4) % videoPool.length;
    const slice = videoPool.slice(start, start + 4);
    return slice.length === 4 ? slice : [...slice, ...videoPool].slice(0, 4);
  }

  // Slice galleries into pages of 4, cycling
  const galleryPool = galleries.length > 0 ? galleries : [];
  function getGalleryPage(pageIdx: number): Gallery[] {
    if (galleryPool.length === 0) return [];
    const start = (pageIdx * 4) % galleryPool.length;
    const slice = galleryPool.slice(start, start + 4);
    return slice.length === 4 ? slice : [...galleryPool, ...galleryPool].slice(start, start + 4);
  }

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      switch (item.type) {
        case 'article_hero':
          return <NewsHeroCard article={item.data} onPress={handleArticlePress} />;

        case 'article_compact':
          return <ArticleCard article={item.data} onPress={handleArticlePress} />;

        case 'video_section': {
          const vids = getVideoPage(item.pageIdx);
          return (
            <NewsVideoSection
              videos={vids}
              onVideoPress={() => {}}
              onSeeAll={() => {}}
            />
          );
        }

        case 'quiz_section': {
          const quiz = QUIZZES[item.quizIdx % QUIZZES.length];
          return <NewsQuizSection quiz={quiz} />;
        }

        case 'gallery_section': {
          const gals = getGalleryPage(item.pageIdx);
          return (
            <NewsGallerySection
              galleries={gals}
              onSeeAll={() => {}}
            />
          );
        }

        case 'story_section': {
          const batch = VISUAL_STORIES[item.pageIdx % VISUAL_STORIES.length];
          return <NewsVisualStoriesSection stories={batch} onSeeAll={() => {}} />;
        }

        default:
          return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleArticlePress, videoPool, galleryPool],
  );

  // Footer spinner is for user-driven infinite scroll only — when we already
  // have results and are loading more. Hidden during the sub-cat scan path
  // (covered by the full-screen LoadingState below) so the user never sees
  // a spinner pinned under the empty state.
  const ListFooterComponent =
    isFetchingNextPage && filteredArticles.length > 0 ? (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : null;

  // Genuine empty state — no retry button, since retrying won't change a
  // category that simply has no articles. Offline gets a separate, retryable
  // message because there *is* something to retry once connectivity returns.
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
      <TopNavBrand onMenuPress={useSideMenuStore.getState().open} />

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        style={styles.catScroll}
      >
        {NEWS_CATEGORIES.map((cat) => {
          const active = cat.id === selectedCategory;
          return (
            <Pressable
              key={cat.id}
              style={[styles.catTab, active && styles.catTabActive]}
              onPress={() => handleCategorySelect(cat.id)}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
            >
              <Text style={[styles.catTabText, active && styles.catTabTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Subcategory strip — appears when a category has subcategories */}
      {subCats.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subCatRow}
          style={styles.subCatScroll}
        >
          {subCats.map((sub) => {
            const active = sub.id === selectedSubCat;
            return (
              <Pressable
                key={sub.id}
                style={[styles.subTab, active && styles.subTabActive]}
                onPress={() => setSelectedSubCat(sub.id)}
                accessibilityRole="button"
                accessibilityLabel={sub.label}
              >
                <Text style={[styles.subTabText, active && styles.subTabTextActive]}>
                  {sub.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Persistent offline banner — visible whenever the device is offline,
          even if we're showing cached articles. Tells the user the feed may
          be stale and gives them a quick retry. */}
      {!isOnline ? (
        <Pressable style={styles.offlineBanner} onPress={() => refetch()}>
          <Text style={styles.offlineBannerText}>
            You're offline. Tap to retry.
          </Text>
        </Pressable>
      ) : null}

      {/* Content */}
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
          data={feedItems}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          getItemType={getItemType}
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },

    // Category tabs
    catScroll: {
      flexGrow: 0,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    catRow: {
      paddingHorizontal: 12,
      paddingVertical: 0,
      gap: 2,
    },
    catTab: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 2.5,
      borderBottomColor: 'transparent',
    },
    catTabActive: {
      borderBottomColor: c.primary,
    },
    catTabText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    catTabTextActive: {
      color: c.primary,
    },

    // Subcategory strip
    subCatScroll: {
      flexGrow: 0,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    subCatRow: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    subTab: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    subTabActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    subTabText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    subTabTextActive: {
      color: c.primary,
    },

    listContent: {
      paddingVertical: 10,
    },
    footer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    offlineBanner: {
      backgroundColor: c.dangerSoft,
      borderTopWidth: 1,
      borderTopColor: c.dangerSoftBorder,
      borderBottomWidth: 1,
      borderBottomColor: c.dangerSoftBorder,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    offlineBannerText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: c.danger,
      letterSpacing: 0.2,
    },
  });
}
