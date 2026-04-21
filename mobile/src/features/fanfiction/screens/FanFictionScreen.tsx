import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import {
  FF_SHOW_TABS,
  FF_GENRE_TABS,
  fetchFanFictions,
  type FanFiction,
  type FanFictionSortTab,
  type FanFictionsPage,
} from '../../../services/api';

import ShowChipsRow from '../components/ShowChipsRow';
import GenreChipsRow from '../components/GenreChipsRow';
import SortTabs from '../components/SortTabs';
import FeaturedCarousel from '../components/FeaturedCarousel';
import StoryCard from '../components/StoryCard';
import FanFictionSkeleton from '../components/FanFictionSkeleton';

const PAGE_SIZE = 20;

function useFanFictionList() {
  return useInfiniteQuery<FanFictionsPage>({
    queryKey: ['fan-fictions', 'list'],
    queryFn: ({ pageParam = 1 }) => fetchFanFictions(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last, allPages) =>
      last.pagination.hasNextPage ? allPages.length + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FanFiction'>;
type SortId = FanFictionSortTab['id'];

const RANK_LABELS: Record<SortId, string> = {
  trending: 'Trending now',
  latest: 'Fresh update',
  popular: 'All-time favourite',
};

function matchesGenre(story: FanFiction, genreId: string): boolean {
  if (genreId === 'all') return true;
  const needle = genreId.toLowerCase();
  return (
    story.genres.some((g) => g.toLowerCase().includes(needle)) ||
    story.tags.some((t) => t.toLowerCase().includes(needle))
  );
}

function sortStories(stories: FanFiction[], sortId: SortId): FanFiction[] {
  const copy = [...stories];
  if (sortId === 'trending') {
    copy.sort((a, b) => (b.likeCount + b.followerCount * 2) - (a.likeCount + a.followerCount * 2));
  } else if (sortId === 'latest') {
    copy.sort((a, b) => {
      const da = a.lastUpdatedRaw ? new Date(a.lastUpdatedRaw).getTime() : 0;
      const db = b.lastUpdatedRaw ? new Date(b.lastUpdatedRaw).getTime() : 0;
      return db - da;
    });
  } else {
    copy.sort((a, b) => b.viewCount - a.viewCount);
  }
  return copy;
}

export default function FanFictionScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeShow, setActiveShow]   = useState('all');
  const [activeGenre, setActiveGenre] = useState('all');
  const [activeSort, setActiveSort]   = useState<SortId>('trending');

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFanFictionList();

  const allStories = useMemo<FanFiction[]>(() => {
    const seen = new Set<string>();
    const out: FanFiction[] = [];
    for (const page of data?.pages || []) {
      for (const s of page.stories) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        out.push(s);
      }
    }
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    const showTab = FF_SHOW_TABS.find((t) => t.id === activeShow);
    const pattern = showTab?.pattern ?? null;
    return allStories.filter((s) => {
      if (pattern) {
        const haystack = `${s.title} ${s.synopsis} ${s.entities.join(' ')} ${s.tags.join(' ')}`;
        if (!pattern.test(haystack)) return false;
      }
      if (!matchesGenre(s, activeGenre)) return false;
      return true;
    });
  }, [allStories, activeShow, activeGenre]);

  const sorted = useMemo(() => sortStories(filtered, activeSort), [filtered, activeSort]);
  const featured = sorted.slice(0, 3);
  const gridItems = featured.length > 0 ? sorted.slice(featured.length) : sorted;

  const handlePress = (s: FanFiction) => {
    navigation.navigate('FanFictionDetail', { id: s.id });
  };

  const clearFilters = () => {
    setActiveShow('all');
    setActiveGenre('all');
    setActiveSort('trending');
  };

  const hasActiveFilters = activeShow !== 'all' || activeGenre !== 'all';
  const totalLabel = `${sorted.length} ${sorted.length === 1 ? 'story' : 'stories'}`;

  return (
    <View style={styles.screen}>
      <TopNavBack title="Fan Fictions" onBack={() => navigation.goBack()} />
      <ShowChipsRow active={activeShow} onChange={setActiveShow} />

      {isLoading ? (
        <FanFictionSkeleton count={5} />
      ) : isError && allStories.length === 0 ? (
        <ErrorState message="Couldn't load fan fictions" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={gridItems}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <StoryCard story={item} onPress={handlePress} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {featured.length > 0 ? (
                <FeaturedCarousel
                  stories={featured}
                  rankLabel={RANK_LABELS[activeSort]}
                  onPress={handlePress}
                />
              ) : null}
              <GenreChipsRow active={activeGenre} onChange={setActiveGenre} />
              <SortTabs active={activeSort} onChange={setActiveSort} />
              <View style={styles.countRow}>
                <Text style={styles.countText}>
                  {FF_GENRE_TABS.find((g) => g.id === activeGenre)?.label || 'All'} · {totalLabel}
                </Text>
                {hasActiveFilters ? (
                  <Pressable onPress={clearFilters} hitSlop={8}>
                    <Text style={styles.clearText}>Clear filters</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>No stories match these filters</Text>
              <Text style={styles.emptySub}>Try changing the show, genre, or sort.</Text>
              {hasActiveFilters ? (
                <Pressable onPress={clearFilters} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>Clear filters</Text>
                </Pressable>
              ) : null}
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
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    listContent: { paddingBottom: 32 },
    countRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    clearText: { fontSize: 11, fontWeight: '700', color: c.primary },
    empty: { padding: 32, alignItems: 'center', gap: 6 },
    emptyEmoji: { fontSize: 36, marginBottom: 4 },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    emptySub: { fontSize: 12, color: c.textTertiary, textAlign: 'center' },
    emptyBtn: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: c.primary,
      borderRadius: 8,
    },
    emptyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
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
