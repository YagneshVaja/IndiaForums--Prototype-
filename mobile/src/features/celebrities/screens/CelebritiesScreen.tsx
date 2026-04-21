import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Celebrity, CelebCategoryId } from '../../../services/api';

import { useCelebritiesRanking } from '../hooks/useCelebritiesRanking';
import { CELEB_CATEGORY_TABS } from '../utils/constants';
import { formatRankRange } from '../utils/formatDate';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

import HeroCard from '../components/HeroCard';
import RunnerCard from '../components/RunnerCard';
import RankRow from '../components/RankRow';
import CelebSkeleton from '../components/CelebSkeleton';
import ErrorBlock from '../components/ErrorBlock';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Celebrities'>;

export default function CelebritiesScreen() {
  const navigation = useNavigation<Nav>();
  const [activeCat, setActiveCat] = useState<CelebCategoryId>('bollywood');
  const { data, isLoading, error, refetch } = useCelebritiesRanking();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const celebs = useMemo<Celebrity[]>(() => {
    if (!data) return [];
    if (activeCat === 'all') return data.celebrities;
    return data.categories[activeCat] ?? [];
  }, [data, activeCat]);

  const hero    = celebs[0] || null;
  const runners = celebs.slice(1, 3);
  const rest    = celebs.slice(3);

  const weekLabel = data ? formatRankRange(data.rankStartDate, data.rankEndDate) : '';

  const handlePress = (c: Celebrity) => {
    navigation.navigate('CelebrityProfile', { celebrity: c });
  };

  return (
    <View style={styles.screen}>
      <TopNavBack title="Celebrities" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <CelebSkeleton />
      ) : error ? (
        <ErrorBlock message="Couldn't load celebrities" onRetry={() => refetch()} />
      ) : (
        <>
          <View style={styles.catBar}>
            <View style={styles.catSegment}>
              {CELEB_CATEGORY_TABS.map((tab) => {
                const active = tab.id === activeCat;
                return (
                  <Pressable
                    key={tab.id}
                    style={[styles.catBtn, active && styles.catBtnActive]}
                    onPress={() => setActiveCat(tab.id)}
                  >
                    <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!!weekLabel && (
              <View style={styles.weekRow}>
                <View style={styles.weekDot} />
                <Text style={styles.weekText}>{weekLabel}</Text>
              </View>
            )}
          </View>

          {celebs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No celebrities found</Text>
            </View>
          ) : (
            <ScrollView style={styles.feed} contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
              {hero && <HeroCard celeb={hero} onPress={handlePress} />}

              {runners.length > 0 && (
                <View style={styles.runnerRow}>
                  {runners.map((c) => (
                    <RunnerCard key={c.id} celeb={c} onPress={handlePress} />
                  ))}
                </View>
              )}

              {rest.length > 0 && (
                <View style={styles.rankList}>
                  <Text style={styles.rankListHeader}>Rankings</Text>
                  {rest.map((c) => (
                    <RankRow key={c.id} celeb={c} onPress={handlePress} />
                  ))}
                </View>
              )}

              <View style={styles.spacer} />
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    catBar: {
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    catSegment: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 999,
      padding: 3,
      gap: 2,
    },
    catBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
    },
    catBtnActive: {
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    catLabel:       { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    catLabelActive: { color: c.primary, fontWeight: '700' },
    weekRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    weekDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary },
    weekText: { fontSize: 11, color: c.textSecondary, fontWeight: '600' },
    feed:    { flex: 1 },
    feedContent: { paddingBottom: 20 },
    runnerRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 12 },
    rankList: {
      marginTop: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    rankListHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    emptyWrap: { alignItems: 'center', padding: 40, gap: 10 },
    emptyIcon: { fontSize: 36 },
    emptyText: { fontSize: 13, color: c.textSecondary },
    spacer: { height: 32 },
  });
}
