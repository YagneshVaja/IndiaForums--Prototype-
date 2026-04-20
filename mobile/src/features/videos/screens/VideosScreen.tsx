import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import SectionHeader from '../../../components/ui/SectionHeader';
import type { HomeStackParamList } from '../../../navigation/types';
import { VIDEO_CAT_TABS, type Video } from '../../../services/api';

import CategoryTabs from '../components/CategoryTabs';
import TrendingVideoCard from '../components/TrendingVideoCard';
import VideoGridCard from '../components/VideoGridCard';
import { useVideos } from '../hooks/useVideos';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Videos'>;

export default function VideosScreen() {
  const navigation = useNavigation<Nav>();
  const [activeCat, setActiveCat] = useState('all');
  const activeTab = VIDEO_CAT_TABS.find((t) => t.id === activeCat) || VIDEO_CAT_TABS[0];

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVideos(activeTab.contentId);

  const allVideos = useMemo<Video[]>(
    () => (data?.pages || []).flatMap((p) => p.videos),
    [data],
  );

  // Client-side filter fallback for categories without server contentId
  const filtered = useMemo(() => {
    if (activeCat === 'all' || activeTab.contentId) return allVideos;
    return allVideos.filter((v) => v.cat === activeCat);
  }, [allVideos, activeCat, activeTab]);

  const trending = useMemo(() => {
    const featured = filtered.filter((v) => v.featured);
    if (featured.length >= 2) return featured.slice(0, 4);
    return filtered.slice(0, 4);
  }, [filtered]);

  const grid = useMemo(() => {
    const trendIds = new Set(trending.map((v) => v.id));
    return filtered.filter((v) => !trendIds.has(v.id));
  }, [filtered, trending]);

  const handlePress = useCallback(
    (video: Video) => {
      navigation.navigate('VideoDetail', { video });
    },
    [navigation],
  );

  const renderGridItem = useCallback(
    ({ item }: { item: Video }) => (
      <View style={styles.gridCell}>
        <VideoGridCard video={item} onPress={handlePress} />
      </View>
    ),
    [handlePress],
  );

  const keyExtractor = useCallback((v: Video) => v.id, []);

  return (
    <View style={styles.screen}>
      <TopNavBack title="Videos" onBack={() => navigation.goBack()} />

      <CategoryTabs
        tabs={VIDEO_CAT_TABS}
        active={activeCat}
        onChange={setActiveCat}
      />

      {isLoading ? (
        <LoadingState height={400} />
      ) : isError ? (
        <ErrorState message="Couldn't load videos" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={grid}
          keyExtractor={keyExtractor}
          renderItem={renderGridItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            trending.length > 0 ? (
              <View>
                <SectionHeader title="Trending Now" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendingRow}
                >
                  {trending.map((v) => (
                    <TrendingVideoCard key={v.id} video={v} onPress={handlePress} />
                  ))}
                </ScrollView>
                <SectionHeader
                  title={activeCat === 'all' ? 'Latest Videos' : activeTab.label}
                />
              </View>
            ) : (
              <SectionHeader
                title={activeCat === 'all' ? 'Latest Videos' : activeTab.label}
              />
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No videos found in this category.</Text>
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
                  {isFetchingNextPage ? 'Loading…' : 'Load More Videos'}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F7' },
  listContent: { paddingBottom: 32 },
  gridRow: { gap: 10, paddingHorizontal: 12 },
  gridCell: { flex: 1, marginBottom: 10 },
  trendingRow: { paddingLeft: 14, paddingRight: 2, paddingBottom: 4 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#8A8A8A', fontSize: 14 },
  loadMore: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
  },
  loadMoreText: { color: '#3558F0', fontWeight: '700', fontSize: 14 },
});
