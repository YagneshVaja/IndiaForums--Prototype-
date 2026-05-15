import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSearchStore } from '../../../store/searchStore';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type {
  SmartSearchItemDto,
  SmartSearchSectionDto,
} from '../../../services/searchApi';

import SearchInputHeader from '../components/SearchInputHeader';
import EntityTypeChip from '../components/EntityTypeChip';
import ResultCard from '../components/ResultCard';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import SectionHeader from '../components/SectionHeader';
import TopResultCard from '../components/TopResultCard';
import TopResultCardSkeleton from '../components/TopResultCardSkeleton';
import TrendingChips from '../components/TrendingChips';
import RecentRow from '../components/RecentRow';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import { useEntityNavigator } from '../hooks/useEntityNavigator';
import { useNotificationBell } from '../../../hooks/useNotificationBell';

type Row =
  | { kind: 'recentsHeader' }
  | { kind: 'recent'; q: string }
  | { kind: 'top'; item: SmartSearchItemDto }
  | { kind: 'section'; label: string; contentTypeId: number }
  | { kind: 'item'; item: SmartSearchItemDto };

const MAX_INLINE_RECENTS = 3;

export default function SearchScreen() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const submit = useSearchStore((s) => s.submit);
  const fetchSmart = useSearchStore((s) => s.fetchSmart);
  const status = useSearchStore((s) => s.status);
  const sections = useSearchStore((s) => s.sections);
  const trending = useSearchStore((s) => s.trending);
  const activeContentTypeId = useSearchStore((s) => s.activeContentTypeId);
  const setFilter = useSearchStore((s) => s.setFilter);
  const loadTrending = useSearchStore((s) => s.loadTrending);
  const recents = useSearchStore((s) => s.recents);
  const removeRecent = useSearchStore((s) => s.removeRecent);
  const clearRecents = useSearchStore((s) => s.clearRecents);

  const { sheetRef, openItem } = useEntityNavigator();
  const { notifCount, openNotifications } = useNotificationBell();

  useEffect(() => {
    void loadTrending();
  }, [loadTrending]);

  const handleSubmit = useCallback((q: string) => { void submit(q); }, [submit]);
  const handleTrendingPress = useCallback((q: string) => {
    void Haptics.selectionAsync().catch(() => undefined);
    void submit(q);
  }, [submit]);
  const handleFilterPress = useCallback((id: number | null) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setFilter(id);
  }, [setFilter]);
  const handleRetry = useCallback(() => {
    const q = query.trim();
    if (q.length < 2) return;
    void fetchSmart(q);
  }, [fetchSmart, query]);

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;

  const filteredSections = useMemo<SmartSearchSectionDto[]>(() => {
    if (activeContentTypeId == null) return sections;
    return sections.filter((s) => s.contentTypeId === activeContentTypeId);
  }, [sections, activeContentTypeId]);

  const matchingRecents = useMemo<string[]>(() => {
    if (!hasQuery) return [];
    const needle = trimmed.toLowerCase();
    const out: string[] = [];
    for (const r of recents) {
      const hay = r.q.toLowerCase();
      if (hay === needle) continue;
      if (!hay.includes(needle)) continue;
      out.push(r.q);
      if (out.length >= MAX_INLINE_RECENTS) break;
    }
    return out;
  }, [recents, hasQuery, trimmed]);

  const rows = useMemo<Row[]>(() => {
    if (!hasQuery || filteredSections.length === 0) return [];
    const out: Row[] = [];

    if (matchingRecents.length > 0) {
      out.push({ kind: 'recentsHeader' });
      for (const q of matchingRecents) out.push({ kind: 'recent', q });
    }

    const firstSection = filteredSections[0];
    const firstItem = firstSection?.items[0];

    if (activeContentTypeId == null && firstItem) {
      out.push({ kind: 'top', item: firstItem });
    }

    for (let i = 0; i < filteredSections.length; i++) {
      const section = filteredSections[i];
      const items = (i === 0 && activeContentTypeId == null)
        ? section.items.slice(1)
        : section.items;
      if (items.length === 0) continue;
      out.push({
        kind: 'section',
        label: section.section,
        contentTypeId: section.contentTypeId,
      });
      for (const item of items) out.push({ kind: 'item', item });
    }
    return dedupRows(out);
  }, [filteredSections, activeContentTypeId, hasQuery, matchingRecents]);

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQuery}
        onSubmit={handleSubmit}
        autoFocus
        loading={hasQuery && status === 'loading'}
        trailingIcon={{
          name: 'notifications-outline',
          onPress: openNotifications,
          badge: notifCount,
          accessibilityLabel: 'Notifications',
        }}
      />

      {hasQuery && sections.length > 0 ? (
        <View style={styles.chipStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStrip}
            keyboardShouldPersistTaps="handled"
          >
            <EntityTypeChip
              label="All"
              active={activeContentTypeId == null}
              onPress={() => handleFilterPress(null)}
            />
            {sections.map((s) => (
              <EntityTypeChip
                key={s.contentTypeId}
                label={s.section}
                active={activeContentTypeId === s.contentTypeId}
                onPress={() => handleFilterPress(s.contentTypeId)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.body}>
        {hasQuery && status === 'loading' && sections.length === 0 ? (
          <View>
            <TopResultCardSkeleton />
            {Array.from({ length: 4 }, (_, i) => <ResultCardSkeleton key={i} />)}
          </View>
        ) : null}

        {hasQuery && status === 'error' ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.textTertiary} />
            <Text style={styles.errorTitle}>Couldn't load search</Text>
            <Pressable
              onPress={handleRetry}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry search"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {hasQuery && status !== 'loading' && status !== 'error' && rows.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.emptyHero}>
              <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>
                No {activeContentTypeId != null ? sectionLabelFor(filteredSections, activeContentTypeId) + ' ' : ''}results for &quot;{trimmed}&quot;
              </Text>
              <Text style={styles.emptyBody}>
                Try a different spelling or remove filters.
              </Text>
            </View>
            {trending.length > 0 ? (
              <TrendingChips trending={trending} onPress={handleTrendingPress} />
            ) : null}
          </ScrollView>
        ) : null}

        {hasQuery && rows.length > 0 ? (
          <FlashList<Row>
            data={rows}
            keyExtractor={(row, i) => {
              switch (row.kind) {
                case 'recentsHeader': return 'recents-header';
                case 'recent': return `recent-${row.q}`;
                case 'top': return `top-${row.item.itemId}`;
                case 'section': return `sec-${row.contentTypeId}-${i}`;
                case 'item': return `item-${row.item.itemId}-${i}`;
              }
            }}
            getItemType={(row) => row.kind}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }) => {
              if (item.kind === 'recentsHeader') {
                return <Text style={styles.inlineRecentsLabel}>RECENT</Text>;
              }
              if (item.kind === 'recent') {
                return (
                  <RecentRow
                    q={item.q}
                    onPress={handleSubmit}
                    onRemove={removeRecent}
                  />
                );
              }
              if (item.kind === 'top') {
                return (
                  <TopResultCard
                    item={item.item}
                    query={query}
                    onPress={openItem}
                  />
                );
              }
              if (item.kind === 'section') {
                const showSeeAll = activeContentTypeId == null;
                return (
                  <SectionHeader
                    label={item.label}
                    onSeeAll={
                      showSeeAll
                        ? () => handleFilterPress(item.contentTypeId)
                        : undefined
                    }
                  />
                );
              }
              return (
                <ResultCard
                  item={item.item}
                  query={query}
                  onPress={openItem}
                />
              );
            }}
          />
        ) : null}

        {!hasQuery ? (
          <FlatList
            data={recents}
            keyExtractor={(r) => r.q}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={
              <View>
                <TrendingChips trending={trending} onPress={handleTrendingPress} />
                {recents.length > 0 ? (
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
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <RecentRow
                q={item.q}
                onPress={handleSubmit}
                onRemove={removeRecent}
              />
            )}
          />
        ) : null}
      </View>

      <UnsupportedEntitySheet ref={sheetRef} />
    </View>
  );
}

function sectionLabelFor(
  sections: SmartSearchSectionDto[],
  id: number,
): string {
  const match = sections.find((s) => s.contentTypeId === id);
  return match ? match.section.toLowerCase() : '';
}

function dedupRows(rows: Row[]): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of rows) {
    if (r.kind === 'top' || r.kind === 'item') {
      const key = `${r.item.contentType}-${r.item.itemId}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(r);
  }
  return out;
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
    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 10, paddingHorizontal: 32, paddingTop: 48,
    },
    errorTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    retryBtn: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 10, backgroundColor: c.primarySoft,
    },
    retryText: { fontSize: 13, fontWeight: '700', color: c.primary },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: c.text, textAlign: 'center' },
    emptyBody: {
      fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18,
    },
    inlineRecentsLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.8,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 4,
      backgroundColor: c.bg,
    },
    emptyScroll: { paddingBottom: 24 },
    emptyHero: {
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 32,
      paddingTop: 48,
      paddingBottom: 8,
    },
  });
}
