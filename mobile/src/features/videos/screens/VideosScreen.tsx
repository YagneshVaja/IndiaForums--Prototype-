import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import SectionHeader from '../../../components/ui/SectionHeader';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { VIDEO_CAT_TABS, type Video } from '../../../services/api';

import CategoryTabs from '../components/CategoryTabs';
import TrendingVideoCard from '../components/TrendingVideoCard';
import VideoGridCard from '../components/VideoGridCard';
import { useVideos } from '../hooks/useVideos';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Videos'>;

export default function VideosScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
    [handlePress, styles.gridCell],
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    listContent: { paddingBottom: 32 },
    gridRow: { gap: 10, paddingHorizontal: 12 },
    gridCell: { flex: 1, marginBottom: 10 },
    trendingRow: { paddingLeft: 14, paddingRight: 2, paddingBottom: 4 },
    empty: { padding: 32, alignItems: 'center' },
    emptyText: { color: c.textTertiary, fontSize: 14 },
    loadMore: {
      margin: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
    },
    loadMoreText: { color: c.primary, fontWeight: '700', fontSize: 14 },
  });
}
