import React, { useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { SearchStackParamList } from '../../../navigation/types';
import { useSearchStore } from '../../../store/searchStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SuggestItemDto } from '../../../services/searchApi';

import SearchInputHeader from '../components/SearchInputHeader';
import { useNotificationBell } from '../../../hooks/useNotificationBell';
import SuggestionRow from '../components/SuggestionRow';
import RecentRow from '../components/RecentRow';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import SuggestionSection from '../components/SuggestionSection';
import SuggestionSpotlight from '../components/SuggestionSpotlight';
import SuggestionSkeleton from '../components/SuggestionSkeleton';
import BrowseTile from '../components/BrowseTile';
import { useEntityNavigator } from '../hooks/useEntityNavigator';
import { groupSuggestions } from '../utils/groupSuggestions';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'SearchMain'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Row =
  | { kind: 'spotlight'; item: SuggestItemDto }
  | { kind: 'section'; entityType: string }
  | { kind: 'suggestion'; item: SuggestItemDto }
  | { kind: 'skeleton'; key: string };

const BROWSE_TILES: { label: string; icon: IoniconName; entityType: string; seed: string }[] = [
  { label: 'Movies',      icon: 'film-outline',         entityType: 'Movie',   seed: 'latest' },
  { label: 'Shows',       icon: 'tv-outline',           entityType: 'Show',    seed: 'latest' },
  { label: 'Celebrities', icon: 'people-outline',       entityType: 'Person',  seed: 'top' },
  { label: 'Articles',    icon: 'newspaper-outline',    entityType: 'Article', seed: 'news' },
  { label: 'Forums',      icon: 'chatbubbles-outline',  entityType: 'Forum',   seed: 'discuss' },
  { label: 'Topics',      icon: 'reader-outline',       entityType: 'Topic',   seed: 'discuss' },
];

export default function SearchMainScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const submit = useSearchStore((s) => s.submit);
  const suggestions = useSearchStore((s) => s.suggestions);
  const suggestStatus = useSearchStore((s) => s.suggestStatus);
  const recents = useSearchStore((s) => s.recents);
  const removeRecent = useSearchStore((s) => s.removeRecent);
  const clearRecents = useSearchStore((s) => s.clearRecents);
  const setEntityFilter = useSearchStore((s) => s.setEntityFilter);

  const { sheetRef, openSuggestion } = useEntityNavigator();
  const { notifCount, openNotifications } = useNotificationBell();

  const handleSubmit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      void submit(trimmed);
      navigation.push('SearchResults');
    },
    [submit, navigation],
  );

  const handleBrowse = useCallback(
    (entityType: string, seed: string) => {
      void submit(seed, entityType);
      navigation.push('SearchResults');
    },
    [submit, navigation],
  );

  const isTyping = query.trim().length >= 2;
  const showSuggestionsList = isTyping && suggestions.length > 0;
  const showSuggestionSkeletons = isTyping && suggestStatus === 'loading' && suggestions.length === 0;

  // Build the heterogeneous row list for the typeahead branch.
  const suggestionRows = useMemo<Row[]>(() => {
    if (showSuggestionSkeletons) {
      return Array.from({ length: 5 }, (_, i) => ({ kind: 'skeleton', key: `sk-${i}` }));
    }
    if (!showSuggestionsList) return [];
    const [first, ...rest] = suggestions;
    const rows: Row[] = first ? [{ kind: 'spotlight', item: first }] : [];
    const groups = groupSuggestions(rest);
    for (const group of groups) {
      rows.push({ kind: 'section', entityType: group.entityType });
      for (const item of group.items) rows.push({ kind: 'suggestion', item });
    }
    return rows;
  }, [showSuggestionsList, showSuggestionSkeletons, suggestions]);

  const SearchForFooter = (
    <Pressable
      onPress={() => handleSubmit(query)}
      style={({ pressed }) => [styles.searchForRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Search for ${query.trim()}`}
    >
      <Ionicons name="search" size={16} color={colors.primary} />
      <Text style={styles.searchForText}>
        Search for "<Text style={styles.searchForBold}>{query.trim()}</Text>"
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQuery}
        onSubmit={handleSubmit}
        autoFocus
        trailingIcon={{
          name: 'notifications-outline',
          onPress: openNotifications,
          badge: notifCount,
          accessibilityLabel: 'Notifications',
        }}
      />

      {showSuggestionsList || showSuggestionSkeletons ? (
        <FlatList<Row>
          data={suggestionRows}
          keyExtractor={(row, i) => {
            // Always include the index to defend against the API returning
            // two phrases that resolve to the same (entityType, entityId).
            if (row.kind === 'spotlight') return `sp-${i}-${row.item.entityId ?? 0}`;
            if (row.kind === 'section') return `sec-${row.entityType}`;
            if (row.kind === 'suggestion') return `s-${i}-${row.item.entityType ?? 'q'}-${row.item.entityId ?? 0}`;
            return row.key;
          }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.kind === 'spotlight') {
              return (
                <SuggestionSpotlight
                  item={item.item}
                  query={query}
                  onPress={() => openSuggestion(item.item)}
                />
              );
            }
            if (item.kind === 'section') {
              return <SuggestionSection entityType={item.entityType} />;
            }
            if (item.kind === 'skeleton') return <SuggestionSkeleton />;
            return (
              <SuggestionRow
                item={item.item}
                query={query}
                onPress={() => openSuggestion(item.item)}
              />
            );
          }}
          ListFooterComponent={SearchForFooter}
        />
      ) : (
        <FlatList
          data={recents}
          keyExtractor={(r) => r.q}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            isTyping ? SearchForFooter
            : recents.length > 0 ? (
              <View style={styles.recentsHeader}>
                <Text style={styles.recentsTitle}>Recent searches</Text>
                <Pressable
                  onPress={clearRecents}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all recent searches"
                >
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isTyping ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyHeader}>
                  <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
                  <Text style={styles.emptyTitle}>Browse India Forums</Text>
                  <Text style={styles.emptyBody}>
                    Or jump into a category to start exploring.
                  </Text>
                </View>
                <View style={styles.tilesGrid}>
                  {chunk(BROWSE_TILES, 2).map((row, i) => (
                    <View key={i} style={styles.tilesRow}>
                      {row.map((t) => (
                        <BrowseTile
                          key={t.label}
                          label={t.label}
                          icon={t.icon}
                          onPress={() => handleBrowse(t.entityType, t.seed)}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )
          }
          renderItem={({ item }) => (
            <RecentRow
              q={item.q}
              onPress={() => handleSubmit(item.q)}
              onRemove={() => removeRecent(item.q)}
            />
          )}
        />
      )}

      <UnsupportedEntitySheet ref={sheetRef} />
    </View>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    recentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 16,
      paddingBottom: 6,
    },
    recentsTitle: {
      fontSize: 12, fontWeight: '700', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.6,
    },
    clearText: { fontSize: 12, fontWeight: '600', color: c.primary },
    empty: { paddingTop: 36, paddingHorizontal: 14, gap: 18 },
    emptyHeader: { alignItems: 'center', gap: 6, paddingHorizontal: 18 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    emptyBody: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
    tilesGrid: { gap: 10 },
    tilesRow: { flexDirection: 'row', gap: 10 },
    searchForRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
      marginTop: 4,
    },
    pressed: { backgroundColor: c.surface },
    searchForText: { fontSize: 14, color: c.text },
    searchForBold: { fontWeight: '700', color: c.primary },
  });
}
