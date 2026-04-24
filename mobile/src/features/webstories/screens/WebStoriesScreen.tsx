import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  type ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { extractApiError, type WebStorySummary } from '../../../services/api';

import WebStoryCard from '../components/WebStoryCard';
import WebStoryGridSkeleton from '../components/WebStoryGridSkeleton';
import { useWebStories } from '../hooks/useWebStories';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'WebStories'>;

const keyExtractor = (s: WebStorySummary) => String(s.id);

export default function WebStoriesScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useWebStories();

  const stories = useMemo<WebStorySummary[]>(() => {
    const seen = new Set<number>();
    const out: WebStorySummary[] = [];
    for (const page of data?.pages ?? []) {
      for (const s of page.stories) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        out.push(s);
      }
    }
    return out;
  }, [data]);

  const totalCount = data?.pages?.[0]?.pagination.totalItems ?? stories.length;

  const handleOpen = useCallback(
    (story: WebStorySummary) => {
      const index = stories.findIndex((s) => s.id === story.id);
      if (index < 0) return;
      navigation.navigate('WebStoryPlayer', { stories, index });
    },
    [navigation, stories],
  );

  const renderItem: ListRenderItem<WebStorySummary> = useCallback(
    ({ item }) => <WebStoryCard story={item} onPress={handleOpen} />,
    [handleOpen],
  );

  const ListHeader = useMemo(
    () => (
      <View>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Web Stories</Text>
          <Text style={styles.introSubtitle}>
            Tap any card to play an immersive, auto-advancing story.
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Latest Stories</Text>
          {!isLoading && stories.length > 0 ? (
            <Text style={styles.sectionCount}>
              {stories.length} of {totalCount}
            </Text>
          ) : null}
        </View>
      </View>
    ),
    [styles, isLoading, stories.length, totalCount],
  );

  if (isLoading && stories.length === 0) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Web Stories" onBack={() => navigation.goBack()} />
        {ListHeader}
        <WebStoryGridSkeleton count={6} />
      </View>
    );
  }

  if (isError && stories.length === 0) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Web Stories" onBack={() => navigation.goBack()} />
        <ErrorState
          message={extractApiError(error, "Couldn't load web stories.")}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopNavBack title="Web Stories" onBack={() => navigation.goBack()} />
      <FlatList
        data={stories}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No web stories yet</Text>
            <Text style={styles.emptySub}>Check back soon.</Text>
          </View>
        }
        ListFooterComponent={
          hasNextPage ? (
            <Pressable
              onPress={() => fetchNextPage()}
              style={styles.loadMore}
              disabled={isFetchingNextPage}
            >
              <Text style={styles.loadMoreText}>
                {isFetchingNextPage ? 'Loading…' : 'Load more stories'}
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
    listContent: {
      paddingHorizontal: 12,
      paddingBottom: 32,
      gap: 10,
    },
    row: {
      gap: 10,
    },
    intro: {
      paddingHorizontal: 4,
      paddingTop: 14,
      paddingBottom: 6,
    },
    introTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.3,
    },
    introSubtitle: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '500',
      color: c.textSecondary,
      lineHeight: 18,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    sectionCount: {
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
      marginHorizontal: 0,
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
