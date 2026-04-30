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

import SearchInputHeader from '../components/SearchInputHeader';
import SuggestionRow from '../components/SuggestionRow';
import RecentRow from '../components/RecentRow';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import { useEntityNavigator } from '../hooks/useEntityNavigator';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'SearchMain'>;
type Styles = ReturnType<typeof makeStyles>;

export default function SearchMainScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const submit = useSearchStore((s) => s.submit);
  const suggestions = useSearchStore((s) => s.suggestions);
  const recents = useSearchStore((s) => s.recents);
  const removeRecent = useSearchStore((s) => s.removeRecent);
  const clearRecents = useSearchStore((s) => s.clearRecents);

  const { sheetRef, openSuggestion } = useEntityNavigator();

  // Fire-and-forget submit so SearchResults can mount immediately and
  // render its own loading state. The store sets resultsStatus:'loading'
  // synchronously inside submit before any await, so there's no race.
  const handleSubmit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      void submit(trimmed);
      navigation.push('SearchResults');
    },
    [submit, navigation],
  );

  const trimmedQuery = query.trim();
  const isTyping = trimmedQuery.length >= 2;
  const showSuggestions = isTyping && suggestions.length > 0;

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQuery}
        onSubmit={handleSubmit}
        autoFocus
      />

      {showSuggestions ? (
        <FlatList
          data={suggestions}
          keyExtractor={(s, i) => `${s.entityType ?? 'q'}-${s.entityId ?? `idx${i}`}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <SuggestionRow item={item} query={query} onPress={() => openSuggestion(item)} />
          )}
          ListFooterComponent={
            <SearchForRow
              query={trimmedQuery}
              onPress={() => handleSubmit(trimmedQuery)}
              styles={styles}
              colors={colors}
            />
          }
        />
      ) : (
        // Idle (no query) OR typing-with-zero-suggestions: both fall through
        // to the recents list. When typing, the "Search for {q}" row sits
        // at the top so the user can submit even with no recents.
        <FlatList
          data={recents}
          keyExtractor={(r) => r.q}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            isTyping ? (
              <SearchForRow
                query={trimmedQuery}
                onPress={() => handleSubmit(trimmedQuery)}
                styles={styles}
                colors={colors}
                topAligned
              />
            ) : recents.length > 0 ? (
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
                <Ionicons name="search-outline" size={42} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>Search India Forums</Text>
                <Text style={styles.emptyBody}>
                  Find movies, shows, celebrities, articles, and forums.
                </Text>
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

interface SearchForRowProps {
  query: string;
  onPress: () => void;
  styles: Styles;
  colors: ThemeColors;
  /** When true, the row sits above other content; flips its border to bottom. */
  topAligned?: boolean;
}

function SearchForRow({ query, onPress, styles, colors, topAligned }: SearchForRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        topAligned ? styles.searchForRowTop : styles.searchForRow,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Search for ${query}`}
    >
      <Ionicons name="search" size={16} color={colors.primary} />
      <Text style={styles.searchForText}>
        Search for "<Text style={styles.searchForBold}>{query}</Text>"
      </Text>
    </Pressable>
  );
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
    empty: {
      alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingTop: 80, paddingHorizontal: 32,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    emptyBody: {
      fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19,
    },
    searchForRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
      marginTop: 4,
    },
    searchForRowTop: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    pressed: { backgroundColor: c.surface },
    searchForText: { fontSize: 14, color: c.text },
    searchForBold: { fontWeight: '700', color: c.primary },
  });
}
