import React, { useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, RefreshControl,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { SearchStackParamList } from '../../../navigation/types';
import { useSearchStore } from '../../../store/searchStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SearchResultItemDto } from '../../../services/searchApi';

import SearchInputHeader from '../components/SearchInputHeader';
import EntityTypeChip from '../components/EntityTypeChip';
import ResultCard from '../components/ResultCard';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import ResultsContextLine from '../components/ResultsContextLine';
import SuggestionSection from '../components/SuggestionSection';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import { useEntityNavigator } from '../hooks/useEntityNavigator';
import { groupResults } from '../utils/groupSuggestions';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'SearchResults'>;
type Styles = ReturnType<typeof makeStyles>;

export default function SearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useSearchStore((s) => s.query);
  const setQueryQuiet = useSearchStore((s) => s.setQueryQuiet);
  const submit = useSearchStore((s) => s.submit);
  const submittedQuery = useSearchStore((s) => s.submittedQuery);
  const results = useSearchStore((s) => s.results);
  const searchLogId = useSearchStore((s) => s.searchLogId);
  const resultsStatus = useSearchStore((s) => s.resultsStatus);
  const isPullRefreshing = useSearchStore((s) => s.isPullRefreshing);
  const activeEntityType = useSearchStore((s) => s.activeEntityType);
  const setEntityFilter = useSearchStore((s) => s.setEntityFilter);
  const refreshResults = useSearchStore((s) => s.refreshResults);
  const pullToRefresh = useSearchStore((s) => s.pullToRefresh);

  const { sheetRef, openResult } = useEntityNavigator();

  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) set.add(r.entityType);
    if (activeEntityType) set.add(activeEntityType);
    return Array.from(set).sort();
  }, [results, activeEntityType]);

  const handleResubmit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      void submit(trimmed);
    },
    [submit],
  );

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQueryQuiet}
        onSubmit={handleResubmit}
        onBack={() => navigation.goBack()}
      />

      {entityTypes.length > 0 ? (
        <View style={styles.chipStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStrip}
            keyboardShouldPersistTaps="handled"
          >
            <EntityTypeChip
              label="All"
              active={activeEntityType == null}
              onPress={() => setEntityFilter(null)}
            />
            {entityTypes.map((t) => (
              <EntityTypeChip
                key={t}
                label={t}
                active={activeEntityType === t}
                onPress={() => setEntityFilter(t)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.body}>
        <Body
          status={resultsStatus}
          results={results}
          submittedQuery={submittedQuery}
          activeEntityType={activeEntityType}
          searchLogId={searchLogId}
          isPullRefreshing={isPullRefreshing}
          onRetry={refreshResults}
          onPullToRefresh={pullToRefresh}
          onPressItem={openResult}
          query={submittedQuery}
          styles={styles}
          colors={colors}
        />
      </View>

      <UnsupportedEntitySheet ref={sheetRef} />
    </View>
  );
}

interface BodyProps {
  status: ReturnType<typeof useSearchStore.getState>['resultsStatus'];
  results: ReturnType<typeof useSearchStore.getState>['results'];
  submittedQuery: string;
  activeEntityType: string | null;
  searchLogId: number | null;
  isPullRefreshing: boolean;
  onRetry: () => void;
  onPullToRefresh: () => Promise<void>;
  onPressItem: ReturnType<typeof useEntityNavigator>['openResult'];
  query: string;
  styles: Styles;
  colors: ThemeColors;
}

function Body({
  status, results, submittedQuery, activeEntityType, searchLogId,
  isPullRefreshing, onRetry, onPullToRefresh, onPressItem, query, styles, colors,
}: BodyProps) {
  // Client-side filter so chip taps feel instant. activeEntityType is the
  // chip the user picked; we narrow the full server result set in memory
  // rather than re-querying. Pull-to-refresh re-fetches with the active
  // filter applied to get a fresh server-filtered top 50.
  const displayedResults = useMemo(() => {
    if (!activeEntityType) return results;
    return results.filter((r) => r.entityType === activeEntityType);
  }, [results, activeEntityType]);

  // Hooks must run unconditionally — compute groups before any early return.
  // When the All filter is active and the result set spans multiple entity
  // types, we render section headers between groups so the user can scan by
  // category. With a single type or a specific filter active, we fall back
  // to the flat list.
  const groups = useMemo(() => groupResults(displayedResults), [displayedResults]);
  const showSections = activeEntityType == null && groups.length > 1;

  if (status === 'loading' && results.length === 0) {
    return (
      <View>
        {Array.from({ length: 4 }, (_, i) => <ResultCardSkeleton key={i} />)}
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.textTertiary} />
        <Text style={styles.errorTitle}>Couldn't load search</Text>
        <Pressable
          onPress={onRetry}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Retry search"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // status === 'empty' means the server returned zero. If we're
  // client-filtering and the filter narrows down to zero locally, treat
  // that the same way.
  if (status === 'empty' || displayedResults.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>
          No {activeEntityType ? `${activeEntityType.toLowerCase()} ` : ''}results for "{submittedQuery}"
        </Text>
        <Text style={styles.emptyBody}>
          Try a different spelling or remove filters.
        </Text>
      </View>
    );
  }

  if (showSections) {
    type Row =
      | { kind: 'section'; entityType: string }
      | { kind: 'card'; item: SearchResultItemDto };
    const rows: Row[] = [];
    for (const group of groups) {
      rows.push({ kind: 'section', entityType: group.entityType });
      for (const item of group.items) rows.push({ kind: 'card', item });
    }
    return (
      <FlashList<Row>
        data={rows}
        keyExtractor={(row, i) => {
          if (row.kind === 'section') return `sec-${row.entityType}`;
          return `${row.item.entityType}-${row.item.entityId}-${i}`;
        }}
        ListHeaderComponent={
          <ResultsContextLine
            count={displayedResults.length}
            query={submittedQuery}
            activeEntityType={activeEntityType}
          />
        }
        renderItem={({ item }) =>
          item.kind === 'section' ? (
            <SuggestionSection entityType={item.entityType} />
          ) : (
            <ResultCard item={item.item} query={query} onPress={() => onPressItem(item.item, searchLogId)} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={onPullToRefresh}
            tintColor={colors.primary}
          />
        }
      />
    );
  }

  return (
    <FlashList
      data={displayedResults}
      keyExtractor={(r, i) => `${i}-${r.entityType}-${r.entityId}`}
      ListHeaderComponent={
        <ResultsContextLine
          count={displayedResults.length}
          query={submittedQuery}
          activeEntityType={activeEntityType}
        />
      }
      renderItem={({ item }) => (
        <ResultCard item={item} query={query} onPress={() => onPressItem(item, searchLogId)} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={onPullToRefresh}
          tintColor={colors.primary}
        />
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    body: { flex: 1 },
    chipStripWrap: {
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    chipStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 10, paddingHorizontal: 32,
    },
    errorTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    retryBtn: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 10, backgroundColor: c.primarySoft,
    },
    retryText: { fontSize: 13, fontWeight: '700', color: c.primary },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    emptyBody: {
      fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18,
    },
  });
}
