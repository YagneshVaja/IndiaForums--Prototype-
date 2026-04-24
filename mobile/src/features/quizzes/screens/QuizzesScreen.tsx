import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { extractApiError, type Quiz } from '../../../services/api';

import QuizListCard from '../components/QuizListCard';
import QuizListSkeleton from '../components/QuizListSkeleton';
import CreatorsStrip from '../components/CreatorsStrip';
import CategoryChipsRow from '../components/CategoryChipsRow';
import { useQuizzes, useQuizCreators } from '../hooks/useQuizzes';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Quizzes'>;

const keyExtractor = (q: Quiz) => String(q.id);

export default function QuizzesScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeCatId, setActiveCatId] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
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

  const visibleQuizzes = useMemo(
    () => (activeCatId ? allQuizzes.filter((q) => q.categoryId === activeCatId) : allQuizzes),
    [allQuizzes, activeCatId],
  );

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

  const renderItem = useCallback(
    ({ item }: { item: Quiz }) => <QuizListCard quiz={item} onPress={handleQuizPress} />,
    [handleQuizPress],
  );

  const ListHeader = useMemo(
    () => (
      <View>
        {categories.length > 0 ? (
          <CategoryChipsRow
            categories={categories}
            activeCatId={activeCatId}
            onChange={setActiveCatId}
          />
        ) : null}

        {!activeCatId && creators.length > 0 ? <CreatorsStrip creators={creators} /> : null}

        {!isLoading && visibleQuizzes.length > 0 ? (
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {activeCatId
                ? `${visibleQuizzes.length} ${visibleQuizzes.length === 1 ? 'quiz' : 'quizzes'} in this category`
                : `${visibleQuizzes.length} quizzes`}
            </Text>
          </View>
        ) : null}
      </View>
    ),
    [categories, activeCatId, creators, isLoading, visibleQuizzes.length, styles],
  );

  if (isLoading && allQuizzes.length === 0) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Fan Quizzes" onBack={() => navigation.goBack()} />
        <QuizListSkeleton count={5} />
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
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No quizzes in this category</Text>
            <Text style={styles.emptySub}>Try a different filter.</Text>
          </View>
        }
        ListFooterComponent={
          !activeCatId && hasNextPage ? (
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
    countRow: {
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    countText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    empty: { padding: 32, alignItems: 'center', gap: 6 },
    emptyEmoji: { fontSize: 36, marginBottom: 4 },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    emptySub: { fontSize: 12, color: c.textTertiary, textAlign: 'center' },
    loadMore: {
      marginHorizontal: 12,
      marginTop: 10,
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
