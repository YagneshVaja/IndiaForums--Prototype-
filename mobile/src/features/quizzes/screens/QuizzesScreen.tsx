import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { extractApiError, type Quiz } from '../../../services/api';

import QuizGridCard from '../components/QuizGridCard';
import FeaturedCarousel, { type FeaturedSlide } from '../components/FeaturedCarousel';
import QuizListSkeleton from '../components/QuizListSkeleton';
import CreatorsStrip from '../components/CreatorsStrip';
import CategoryChipsRow from '../components/CategoryChipsRow';
import CategoryHero from '../components/CategoryHero';
import HallOfFameStrip from '../components/HallOfFameStrip';
import QuickFilterPills, { type SortKey } from '../components/QuickFilterPills';
import { useQuizzes, useQuizCreators, useQuizPlayers } from '../hooks/useQuizzes';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Quizzes'>;

const keyExtractor = (q: Quiz) => String(q.id);

function parseDate(s: string): number {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

function freshnessFor(updatedAt: number, now: number): string {
  if (!updatedAt) return '';
  const sec = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (sec < 30)        return 'Updated just now';
  if (sec < 60)        return 'Updated <1m ago';
  const min = Math.floor(sec / 60);
  if (min < 60)        return `Updated ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)         return `Updated ${hr}h ago`;
  return 'Updated today';
}

function applySort(quizzes: Quiz[], sort: SortKey): Quiz[] {
  switch (sort) {
    case 'trending':
      return [...quizzes].sort((a, b) => b.plays_raw - a.plays_raw);
    case 'quick':
      return quizzes.filter((q) => q.questions > 0 && q.questions <= 5);
    case 'personality':
      return quizzes.filter((q) => q.quizTypeName === 'Personality');
    case 'trivia':
      return quizzes.filter((q) => q.quizTypeName === 'Trivia');
    case 'all':
    default:
      return quizzes;
  }
}

export default function QuizzesScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('all');
  const [surpriseOffset, setSurpriseOffset] = useState(0);

  // Re-render every 60s so the "Updated Xm ago" pill stays current.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const {
    data,
    isLoading,
    isError,
    isRefetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    dataUpdatedAt,
  } = useQuizzes();

  const { data: creators = [] } = useQuizCreators();

  const allQuizzes = useMemo<Quiz[]>(() => {
    const seen = new Set<number>();
    const out: Quiz[] = [];
    for (const page of data?.pages || []) {
      for (const q of page.quizzes) {
        if (seen.has(q.id)) continue;
        seen.add(q.id);
        out.push(q);
      }
    }
    return out;
  }, [data]);

  const categories = data?.pages?.[0]?.categories ?? [];

  const activeCategory = useMemo(
    () => (activeCatId ? categories.find((c) => c.categoryId === activeCatId) : null),
    [activeCatId, categories],
  );

  // Featured carousel — three picks chosen by different rules so newer/varied
  // quizzes get exposure even though there's no backend "featured" flag.
  //   trending = highest plays_raw
  //   fresh    = newest publishedWhen
  //   surprise = date-seeded pick from the rest (changes daily)
  const featuredSlides = useMemo<FeaturedSlide[]>(() => {
    if (activeCatId || allQuizzes.length === 0) return [];

    const trending = allQuizzes.reduce(
      (best, q) => (q.plays_raw > (best?.plays_raw ?? -1) ? q : best),
      null as Quiz | null,
    );

    const usedIds = new Set<number>();
    const slides: FeaturedSlide[] = [];
    if (trending) {
      slides.push({ kind: 'trending', quiz: trending });
      usedIds.add(trending.id);
    }

    const remainingForFresh = allQuizzes.filter((q) => !usedIds.has(q.id));
    const fresh = remainingForFresh
      .map((q) => ({ q, t: parseDate(q.publishedWhen) }))
      .sort((a, b) => b.t - a.t)[0]?.q;
    if (fresh) {
      slides.push({ kind: 'fresh', quiz: fresh });
      usedIds.add(fresh.id);
    }

    const remainingForSurprise = allQuizzes.filter((q) => !usedIds.has(q.id));
    if (remainingForSurprise.length > 0) {
      const dayIndex = Math.floor(Date.now() / 86_400_000);
      const pickIdx = (dayIndex + surpriseOffset) % remainingForSurprise.length;
      const surprise = remainingForSurprise[pickIdx];
      slides.push({ kind: 'surprise', quiz: surprise });
      usedIds.add(surprise.id);
    }

    return slides;
  }, [allQuizzes, activeCatId, surpriseOffset]);

  const featuredQuizIds = useMemo(
    () => new Set(featuredSlides.map((s) => s.quiz.id)),
    [featuredSlides],
  );

  // Anchor Hall of Fame to the trending pick (most likely to have leaderboard data).
  const hallOfFameQuiz = featuredSlides.find((s) => s.kind === 'trending')?.quiz ?? null;
  const { data: hofPlayers = [] } = useQuizPlayers(hallOfFameQuiz?.id ?? null);

  const visibleQuizzes = useMemo(() => {
    const inCategory = activeCatId
      ? allQuizzes.filter((q) => q.categoryId === activeCatId)
      : allQuizzes;
    const withoutFeatured = inCategory.filter((q) => !featuredQuizIds.has(q.id));
    return applySort(withoutFeatured, sort);
  }, [allQuizzes, activeCatId, featuredQuizIds, sort]);

  const categoryTotalPlays = useMemo(() => {
    if (!activeCatId) return 0;
    return allQuizzes
      .filter((q) => q.categoryId === activeCatId)
      .reduce((sum, q) => sum + (q.plays_raw || 0), 0);
  }, [allQuizzes, activeCatId]);

  const handleQuizPress = useCallback(
    (quiz: Quiz) => {
      navigation.navigate('QuizDetail', {
        id: String(quiz.id),
        title: quiz.title,
        thumbnail: quiz.thumbnail,
      });
    },
    [navigation],
  );

  const handleRerollSurprise = useCallback(() => {
    setSurpriseOffset((o) => o + 1);
  }, []);

  const freshnessLabel = useMemo(
    () => freshnessFor(dataUpdatedAt, nowTick),
    [dataUpdatedAt, nowTick],
  );

  const handleHallOfFameSeeAll = useCallback(() => {
    if (!hallOfFameQuiz) return;
    navigation.navigate('QuizLeaderboard', { id: String(hallOfFameQuiz.id) });
  }, [navigation, hallOfFameQuiz]);

  const renderItem = useCallback(
    ({ item }: { item: Quiz }) => <QuizGridCard quiz={item} onPress={handleQuizPress} />,
    [handleQuizPress],
  );

  const sortLabel = useMemo(() => {
    if (activeCategory) return 'In this category';
    switch (sort) {
      case 'trending':    return '🔥 Trending now';
      case 'quick':       return '⚡ Quick quizzes';
      case 'personality': return '✨ Personality';
      case 'trivia':      return '🧠 Trivia';
      default:            return '🎯 Browse all';
    }
  }, [sort, activeCategory]);

  const ListHeader = useMemo(
    () => (
      <View>
        {categories.length > 0 ? (
          <CategoryChipsRow
            categories={categories}
            activeCatId={activeCatId}
            onChange={(id) => {
              setActiveCatId(id);
              setSort('all');
            }}
          />
        ) : null}

        {activeCategory ? (
          <CategoryHero
            categoryName={activeCategory.categoryName}
            quizCount={activeCategory.quizCount}
            totalPlays={categoryTotalPlays}
          />
        ) : null}

        {featuredSlides.length > 0 ? (
          <FeaturedCarousel
            slides={featuredSlides}
            freshnessLabel={freshnessLabel}
            onPress={handleQuizPress}
            onReroll={handleRerollSurprise}
          />
        ) : null}

        {hallOfFameQuiz && hofPlayers.length > 0 ? (
          <HallOfFameStrip
            players={hofPlayers}
            quizTitle={hallOfFameQuiz.title}
            onSeeAll={handleHallOfFameSeeAll}
          />
        ) : null}

        {!activeCatId && creators.length > 0 ? <CreatorsStrip creators={creators} /> : null}

        <QuickFilterPills active={sort} onChange={setSort} />

        {!isLoading ? (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{sortLabel}</Text>
            <Text style={styles.sectionCount}>
              {visibleQuizzes.length} {visibleQuizzes.length === 1 ? 'quiz' : 'quizzes'}
            </Text>
          </View>
        ) : null}
      </View>
    ),
    [
      categories,
      activeCatId,
      activeCategory,
      categoryTotalPlays,
      featuredSlides,
      freshnessLabel,
      hallOfFameQuiz,
      hofPlayers,
      creators,
      sort,
      sortLabel,
      isLoading,
      visibleQuizzes.length,
      styles,
      handleQuizPress,
      handleHallOfFameSeeAll,
      handleRerollSurprise,
    ],
  );

  if (isLoading && allQuizzes.length === 0) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Fan Quizzes" onBack={() => navigation.goBack()} />
        <QuizListSkeleton count={6} />
      </View>
    );
  }

  if (isError && allQuizzes.length === 0) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Fan Quizzes" onBack={() => navigation.goBack()} />
        <ErrorState message={extractApiError(error, "Couldn't load quizzes.")} onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopNavBack title="Fan Quizzes" onBack={() => navigation.goBack()} />
      <FlatList
        data={visibleQuizzes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>Try a different filter.</Text>
          </View>
        }
        ListFooterComponent={
          !activeCatId && sort === 'all' && hasNextPage ? (
            <Pressable
              onPress={() => fetchNextPage()}
              style={styles.loadMore}
              disabled={isFetchingNextPage}
            >
              <Text style={styles.loadMoreText}>
                {isFetchingNextPage ? 'Loading…' : 'Load more quizzes'}
              </Text>
            </Pressable>
          ) : (
            <View style={{ height: 24 }} />
          )
        }
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    listContent: { paddingBottom: 32 },
    gridRow: {
      gap: 10,
      paddingHorizontal: 12,
      marginTop: 10,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.2,
    },
    sectionCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.3,
    },
    empty: { padding: 32, alignItems: 'center', gap: 6 },
    emptyEmoji: { fontSize: 36, marginBottom: 4 },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    emptySub: { fontSize: 12, color: c.textTertiary, textAlign: 'center' },
    loadMore: {
      marginHorizontal: 12,
      marginTop: 14,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
    },
    loadMoreText: { color: c.textSecondary, fontWeight: '700', fontSize: 13 },
  });
}
