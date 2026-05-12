import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { GALLERY_CAT_TABS, type Gallery } from '../../../services/api';

import CategoryTabs from '../components/CategoryTabs';
import GalleryCard from '../components/GalleryCard';
import GalleryHeroCard from '../components/GalleryHeroCard';
import GallerySkeleton from '../components/GallerySkeleton';
import { useGalleries } from '../hooks/useGalleries';

const GALLERY_ACCENT = '#D63636';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Galleries'>;
type Styles = ReturnType<typeof makeStyles>;

export default function GalleriesScreen() {
  const navigation = useNavigation<Nav>();
  const styles = useThemedStyles(makeStyles);
  const [activeCat, setActiveCat] = useState('all');
  const activeTab = GALLERY_CAT_TABS.find((t) => t.id === activeCat) || GALLERY_CAT_TABS[0];
  const isAll = activeCat === 'all';

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGalleries(activeTab.categoryId);

  const allGalleries = useMemo<Gallery[]>(
    () => (data?.pages || []).flatMap((p) => p.galleries),
    [data],
  );

  const pagination = data?.pages[data.pages.length - 1]?.pagination;
  const totalAlbums = pagination?.totalItems ?? allGalleries.length;
  const totalPages  = pagination?.totalPages ?? 1;

  const featured = !isAll ? (allGalleries.find(g => g.featured) || allGalleries[0]) : null;
  const gridItems = !isAll && featured
    ? allGalleries.filter(g => g.id !== featured.id)
    : allGalleries;

  const handlePress = (g: Gallery) => {
    navigation.navigate('GalleryDetail', { gallery: g });
  };

  const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}K+` : String(n));

  return (
    <View style={styles.screen}>
      <TopNavBack title="Galleries" onBack={() => navigation.goBack()} />
      <CategoryTabs
        tabs={GALLERY_CAT_TABS}
        active={activeCat}
        onChange={setActiveCat}
      />

      {isLoading ? (
        <GallerySkeleton count={6} />
      ) : isError ? (
        <ErrorState message="Couldn't load galleries" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={gridItems}
          keyExtractor={(g) => String(g.id)}
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <GalleryCard gallery={item} onPress={handlePress} />
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              {isAll ? (
                <View style={styles.statsRow}>
                  <Stat styles={styles} num={formatCount(totalAlbums)} label="Albums" />
                  <View style={styles.statDivider} />
                  <Stat styles={styles} num={String(allGalleries.length)} label="Loaded" />
                  <View style={styles.statDivider} />
                  <Stat styles={styles} num={String(totalPages)} label="Pages" />
                </View>
              ) : featured ? (
                <GalleryHeroCard
                  gallery={featured}
                  catLabel={activeTab.label}
                  onPress={handlePress}
                />
              ) : null}
              <Text style={styles.sectionLabel}>
                {isAll
                  ? 'ALL GALLERIES'
                  : `${activeTab.label.toUpperCase()} · ${formatCount(totalAlbums)} ALBUMS`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No galleries in this category yet.</Text>
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
                  {isFetchingNextPage ? 'Loading…' : 'Load More'}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

function Stat({ styles, num, label }: { styles: Styles; num: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    listContent: { paddingBottom: 32 },
    gridRow: { gap: 10, paddingHorizontal: 12 },
    gridCell: { flex: 1, marginBottom: 10 },
    header: { paddingTop: 12 },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: c.card,
      borderRadius: 10,
      paddingVertical: 12,
      marginHorizontal: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    statItem: { alignItems: 'center', gap: 2 },
    statNum: { fontSize: 18, fontWeight: '800', color: GALLERY_ACCENT },
    statLabel: {
      fontSize: 9,
      color: c.textTertiary,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    statDivider: { width: 1, height: 28, backgroundColor: c.border },
    sectionLabel: {
      alignSelf: 'flex-start',
      fontSize: 10,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 1,
      marginHorizontal: 12,
      marginTop: 14,
      marginBottom: 10,
      paddingBottom: 6,
      borderBottomWidth: 2,
      borderBottomColor: GALLERY_ACCENT,
    },
    empty: { padding: 32, alignItems: 'center' },
    emptyText: { color: c.textTertiary, fontSize: 14 },
    loadMore: {
      marginHorizontal: 12,
      marginTop: 4,
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
