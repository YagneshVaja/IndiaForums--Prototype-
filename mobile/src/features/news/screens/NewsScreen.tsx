import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import type { NewsStackParamList } from '../../../navigation/types';
import AnimatedTopBar from '../../../components/layout/chromeScroll/AnimatedTopBar';
import { useNotificationBell } from '../../../hooks/useNotificationBell';
import { useScrollChrome } from '../../../components/layout/chromeScroll/useScrollChrome';
import { useSideMenuStore } from '../../../store/sideMenuStore';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
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
import BrandRefreshIndicator from '../../../components/ui/BrandPullToRefresh';
import type { Article } from '../../../services/api';

type Props = NativeStackScreenProps<NewsStackParamList, 'NewsMain'>;

// Number of articles surfaced in the Latest News preview before the
// "VIEW ALL NEWS" CTA hands off to the full-list screen. Mirrors the
// website's 3×4 = 12 tile grid: 1 hero up top + 11 compact rows reads as a
// curated section on mobile and gives the user a clear stopping point
// instead of endless mixed scroll.
const LATEST_NEWS_PREVIEW = 12;

// Sub-cat scan (e.g. TAMIL, KOREAN) auto-fetches additional pages of
// /articles/list when the current pages contain no matches. Cap so a sub-cat
// with zero articles can't loop through the entire archive.
const MAX_AUTO_FETCH_PAGES = 4;

export default function NewsScreen({ navigation, route }: Props) {
  // Home's "View all" pill passes initialCategory so the News tab opens
  // pre-filtered to whatever chip was active on Home.
  const initialCategory = route.params?.initialCategory ?? 'all';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubCat,   setSelectedSubCat]   = useState('all');

  useEffect(() => {
    const next = route.params?.initialCategory;
    if (next && next !== selectedCategory) {
      setSelectedCategory(next);
      setSelectedSubCat('all');
    }
    // Intentionally exclude selectedCategory: this effect is a one-shot sync
    // when the *param* changes, not a feedback loop on local state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.initialCategory]);

  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const { scrollHandler, resetChrome } = useScrollChrome();
  const [topInset, setTopInset] = useState(0);
  const { notifCount, openNotifications } = useNotificationBell();

  useFocusEffect(
    useCallback(() => {
      resetChrome();
    }, [resetChrome]),
  );

  // /home/articles filters server-side; when only a parent category is
  // active (sub=ALL), use that endpoint and skip catId filter below.
  const usingHomeApi = selectedCategory !== 'all' && selectedSubCat === 'all';
  const isOnline = useIsOnline();

  const {
    data, isLoading, isError, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useNewsArticles(selectedCategory, selectedSubCat !== 'all');

  const { data: videos = [] }    = useNewsVideos();
  const { data: galleries = [] } = useNewsGalleries();

  // Pull-to-refresh: invalidate all News query roots. Both
  // `useNewsArticles` variants live under ['articles','news',...] and the
  // inline video/gallery hooks live under ['news',...].
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    resetChrome();
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['articles', 'news'] }),
        queryClient.invalidateQueries({ queryKey: ['news'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, resetChrome]);

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

  // Filter hierarchy:
  //   ALL                → no filter (uses /articles/list, no server filter)
  //   parent, subcat=ALL → server-filtered via /home/articles, no client filter
  //   parent + subcat    → uses /articles/list, filter by catId === subId
  const filteredArticles: Article[] = useMemo(() => {
    if (selectedCategory === 'all') return articles;
    if (usingHomeApi) return articles;
    const subId = Number(selectedSubCat);
    return articles.filter((a) => a.catId === subId);
  }, [articles, selectedCategory, selectedSubCat, usingHomeApi]);

  // Cap the preview so the user always reaches the VIEW ALL CTA on the same
  // visual rhythm regardless of how many articles the API returned.
  const previewArticles = useMemo(
    () => filteredArticles.slice(0, LATEST_NEWS_PREVIEW),
    [filteredArticles],
  );

  // Treat the auto-fetch hunt as full-screen "loading" so the user never
  // glimpses an empty Latest News section between page fetches.
  const loadedPages = data?.pages?.length ?? 0;
  const isScanning =
    filteredArticles.length === 0 &&
    articles.length > 0 &&
    hasNextPage &&
    loadedPages < MAX_AUTO_FETCH_PAGES;

  // Auto-fetch for rare sub-cats (TAMIL, KOREAN) that may not match anything
  // on page 1.
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

  const handleViewAllNews = useCallback(() => {
    navigation.navigate('ArticlesFullList', {
      category: selectedCategory,
      subCat: selectedSubCat,
    });
  }, [navigation, selectedCategory, selectedSubCat]);

  // Take the first 4 of each pool — same volume the old interleaved feed
  // showed, but as a single horizontal carousel instead of repeated rows.
  const previewVideos    = useMemo(() => videos.slice(0, 4),    [videos]);
  const previewGalleries = useMemo(() => galleries.slice(0, 4), [galleries]);
  const featuredQuiz     = QUIZZES[0];
  const previewStories   = VISUAL_STORIES[0] ?? [];

  return (
    <View style={styles.screen}>
      <AnimatedTopBar
        onMeasure={setTopInset}
        onMenuPress={useSideMenuStore.getState().open}
        onNotificationsPress={openNotifications}
        notifCount={notifCount}
      >
        {/* Category tabs + subcategory strip animate and measure together
            with the brand bar — same pattern as the Forums sub-tabs.
            Keeping them inside AnimatedTopBar means topInset reflects the
            full chrome height so the body's paddingTop lines up exactly
            below the strip with no blank gap. */}
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
      </AnimatedTopBar>

      {/* Persistent offline banner */}
      {!isOnline ? (
        <Pressable style={styles.offlineBanner} onPress={() => refetch()}>
          <Text style={styles.offlineBannerText}>
            You're offline. Tap to retry.
          </Text>
        </Pressable>
      ) : null}

      {/* Body */}
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
         
        <Animated.ScrollView
          style={styles.scrollBody}
          contentContainerStyle={[styles.scrollContent, { paddingTop: topInset }]}
          showsVerticalScrollIndicator={false}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onScroll={scrollHandler as any}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              // OS spinner hidden — BrandRefreshIndicator paints on top while
              // the native RefreshControl owns the gesture and threshold.
              tintColor="transparent"
              colors={['transparent']}
              progressBackgroundColor="transparent"
              progressViewOffset={topInset}
            />
          }
        >
          {/* ── Latest News section ───────────────────────────────────── */}
          <View style={styles.newsSection}>
            <SectionHeader title="Latest News" colors={colors} styles={styles} />

            {previewArticles.length === 0 ? (
              <View style={styles.emptyNews}>
                <Ionicons name="newspaper-outline" size={28} color={colors.textTertiary} />
                <Text style={styles.emptyNewsText}>
                  No articles found in this category.
                </Text>
              </View>
            ) : (
              <>
                {previewArticles.map((article, i) =>
                  i === 0 ? (
                    <NewsHeroCard
                      key={article.id}
                      article={article}
                      onPress={handleArticlePress}
                    />
                  ) : (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onPress={handleArticlePress}
                    />
                  ),
                )}

                {/* VIEW ALL CTA — only when there's plausibly more to view.
                    A sub-cat that returned exactly 6 articles wouldn't grow on
                    drill-in; hide the pill so the user isn't sent to a screen
                    that mirrors what they're already looking at. */}
                {filteredArticles.length >= LATEST_NEWS_PREVIEW &&
                 (hasNextPage || filteredArticles.length > LATEST_NEWS_PREVIEW) ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.viewAllPill,
                      pressed && styles.viewAllPillPressed,
                    ]}
                    onPress={handleViewAllNews}
                    accessibilityRole="button"
                    accessibilityLabel="View all news"
                  >
                    <Text style={styles.viewAllPillText}>View all news</Text>
                    <Ionicons name="arrow-forward" size={15} color={colors.primary} />
                  </Pressable>
                ) : null}
              </>
            )}
          </View>

          {/* ── Videos ────────────────────────────────────────────────── */}
          <NewsVideoSection
            videos={previewVideos}
            onVideoPress={() => {}}
            onSeeAll={() => {}}
          />

          {/* ── Quiz ──────────────────────────────────────────────────── */}
          {featuredQuiz ? <NewsQuizSection quiz={featuredQuiz} /> : null}

          {/* ── Galleries ─────────────────────────────────────────────── */}
          <NewsGallerySection
            galleries={previewGalleries}
            onSeeAll={() => {}}
          />

          {/* ── Visual stories ────────────────────────────────────────── */}
          <NewsVisualStoriesSection
            stories={previewStories}
            onSeeAll={() => {}}
          />
        </Animated.ScrollView>
      )}

      <BrandRefreshIndicator refreshing={refreshing} topInset={topInset} />
    </View>
  );
}

// ─── Section header (title + optional VIEW ALL pill) ─────────────────────────

function SectionHeader({
  title,
  colors,
  styles,
}: {
  title: string;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {/* Tiny indicator dot mirrors the website's NEWS · ALL marker so the
          screen visually tracks back to the live design without lifting the
          web's three-column grid (which doesn't read well at phone width). */}
      <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
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

    // Body scroll
    scrollBody: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 6,
      paddingBottom: 24,
    },

    // Latest News section
    newsSection: {
      paddingTop: 8,
      paddingBottom: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingTop: 4,
      paddingBottom: 10,
    },
    sectionAccent: {
      width: 3.5,
      height: 16,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.3,
      flex: 1,
    },
    sectionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    // Empty state inside the news section (vs. full-screen ErrorState)
    emptyNews: {
      paddingVertical: 32,
      alignItems: 'center',
      gap: 8,
    },
    emptyNewsText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textTertiary,
      letterSpacing: 0.2,
    },

    // VIEW ALL CTA — minimal outlined pill matching HomeScreen so the two
    // entry points feel like the same control. Soft primary tint, primary
    // border + text, sized to fit naturally inside the section.
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
