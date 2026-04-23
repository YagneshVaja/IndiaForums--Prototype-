import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';

import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import { describeFetchError } from '../../../services/fetchError';
import SearchBar from './SearchBar';
import CategoryChips, { type ChipItem } from './CategoryChips';
import ForumCard from './ForumCard';
import { useForumHome } from '../hooks/useForumHome';
import type { Forum } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  onForumPress: (forum: Forum) => void;
}

export default function ForumListView({ onForumPress }: Props) {
  const [activeCat, setActiveCat] = useState('all');
  const [activeSubCat, setActiveSubCat] = useState('all');
  const [search, setSearch] = useState('');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const apiCategoryId = useMemo(() => {
    if (activeSubCat !== 'all') return Number(activeSubCat);
    if (activeCat !== 'all')    return Number(activeCat);
    return null;
  }, [activeCat, activeSubCat]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useForumHome(apiCategoryId);

  const firstPage = data?.pages[0];
  const categories = firstPage?.categories || [];
  const subCatMap = firstPage?.subCatMap || {};
  const totalCount = firstPage?.totalForumCount ?? 0;

  const forums = useMemo<Forum[]>(
    () => (data?.pages || []).flatMap(p => p.forums),
    [data],
  );

  const catChips: ChipItem[] = useMemo(() => {
    const chips: ChipItem[] = [{ id: 'all', label: 'All' }];
    categories.forEach(c => chips.push({ id: String(c.id), label: c.name }));
    return chips;
  }, [categories]);

  const subCatChips: ChipItem[] = useMemo(() => {
    if (activeCat === 'all') return [];
    const subs = subCatMap[Number(activeCat)] || [];
    if (subs.length === 0) return [];
    return [{ id: 'all', label: 'All' }, ...subs.map(s => ({ id: String(s.id), label: s.name }))];
  }, [activeCat, subCatMap]);

  const displayForums = useMemo(() => {
    if (!search.trim()) return forums;
    const q = search.toLowerCase();
    return forums.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  }, [forums, search]);

  function selectCat(id: string) {
    setActiveCat(id);
    setActiveSubCat('all');
  }

  if (isLoading && !data) return <LoadingState height={400} />;
  if (isError && !data) return (
    <ErrorState
      message={describeFetchError(error, "Couldn't load forums.")}
      onRetry={() => refetch()}
    />
  );

  return (
    <FlatList
      data={displayForums}
      keyExtractor={f => String(f.id)}
      renderItem={({ item }) => <ForumCard forum={item} onPress={onForumPress} />}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage && !search.trim()) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search forums..."
          />
          <CategoryChips
            chips={catChips}
            activeId={activeCat}
            onChange={selectCat}
          />
          {subCatChips.length > 0 && (
            <CategoryChips
              chips={subCatChips}
              activeId={activeSubCat}
              onChange={setActiveSubCat}
              variant="secondary"
            />
          )}
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {totalCount.toLocaleString()} FORUMS
            </Text>
            {!!search.trim() && <Text style={styles.filteredTag}>filtered</Text>}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No forums found</Text>
          <Text style={styles.emptySubtitle}>Try a different search or category</Text>
        </View>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      contentContainerStyle={styles.content}
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingTop: 0,
      paddingBottom: 24,
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
    },
    countText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.5,
    },
    filteredTag: {
      fontSize: 10,
      fontWeight: '700',
      color: c.primary,
      backgroundColor: c.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    empty: {
      alignItems: 'center',
      padding: 40,
      gap: 8,
    },
    emptyIcon: {
      fontSize: 36,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    emptySubtitle: {
      fontSize: 12,
      color: c.textTertiary,
      textAlign: 'center',
    },
    footer: {
      paddingVertical: 16,
    },
  });
}
