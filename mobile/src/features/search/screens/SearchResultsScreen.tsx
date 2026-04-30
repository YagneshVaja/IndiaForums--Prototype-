import React, { useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable, RefreshControl,
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

import SearchInputHeader from '../components/SearchInputHeader';
import EntityTypeChip from '../components/EntityTypeChip';
import ResultCard from '../components/ResultCard';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import { useEntityNavigator } from '../hooks/useEntityNavigator';

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
  const activeEntityType = useSearchStore((s) => s.activeEntityType);
  const setEntityFilter = useSearchStore((s) => s.setEntityFilter);
  const refreshResults = useSearchStore((s) => s.refreshResults);

  const { sheetRef, openResult } = useEntityNavigator();

  // Build the chip list dynamically from the result set so we never show a
  // chip with zero matches. "All" is always first; the active filter is
  // included even if the current narrowed result set wouldn't otherwise
  // contain it (so the user can tap it back off).
  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) set.add(r.entityType);
    if (activeEntityType) set.add(activeEntityType);
    return Array.from(set).sort();
  }, [results, activeEntityType]);

  // Fire-and-forget resubmit so the spinner shows immediately. The store
  // mutates resultsStatus synchronously inside submit before any await.
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
          searchLogId={searchLogId}
          onRetry={refreshResults}
          onPressItem={openResult}
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
  searchLogId: number | null;
  onRetry: () => void;
  onPressItem: ReturnType<typeof useEntityNavigator>['openResult'];
  styles: Styles;
  colors: ThemeColors;
}

function Body({
  status, results, submittedQuery, searchLogId, onRetry, onPressItem, styles, colors,
}: BodyProps) {
  if (status === 'loading' && results.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
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

  if (status === 'empty') {
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No results for "{submittedQuery}"</Text>
        <Text style={styles.emptyBody}>
          Try a different spelling or remove filters.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={results}
      keyExtractor={(r) => `${r.entityType}-${r.entityId}`}
      renderItem={({ item }) => (
        <ResultCard item={item} query={submittedQuery} onPress={() => onPressItem(item, searchLogId)} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={status === 'loading'}
          onRefresh={onRetry}
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
