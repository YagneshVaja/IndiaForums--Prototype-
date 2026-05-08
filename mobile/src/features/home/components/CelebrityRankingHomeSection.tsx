import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Celebrity } from '../../../services/api';
import { useCelebritiesRanking } from '../../celebrities/hooks/useCelebritiesRanking';
import { formatRankRange } from '../../celebrities/utils/formatDate';
import CelebrityRankTile from './CelebrityRankTile';

const PREVIEW_COUNT = 10;
const SKELETON_COUNT = 5;

type HomeCategoryId = 'bollywood' | 'television' | 'creators';

const HOME_CATEGORY_TABS: { id: HomeCategoryId; label: string }[] = [
  { id: 'bollywood', label: 'Bollywood' },
  { id: 'television', label: 'Television' },
  { id: 'creators', label: 'Creators' },
];

const HOME_CATEGORY_FALLBACK_LABEL: Record<HomeCategoryId, string> = {
  bollywood: 'Bollywood',
  television: 'Television',
  creators: 'Creators',
};

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function CelebrityRankingHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const [activeCat, setActiveCat] = useState<HomeCategoryId>('bollywood');
  const { data, isLoading, isError } = useCelebritiesRanking();

  const activeList = useMemo<Celebrity[]>(
    () => data?.categories[activeCat] ?? [],
    [data, activeCat],
  );
  const previewCelebs = useMemo<Celebrity[]>(
    () => activeList.slice(0, PREVIEW_COUNT),
    [activeList],
  );

  const totalAcrossCategories = useMemo(() => {
    if (!data) return 0;
    return (
      data.categories.bollywood.length +
      data.categories.television.length +
      data.categories.creators.length
    );
  }, [data]);

  const weekLabel = useMemo(
    () =>
      data ? formatRankRange(data.rankStartDate, data.rankEndDate) : '',
    [data],
  );

  const handleCelebPress = useCallback(
    (celebrity: Celebrity) =>
      navigation.navigate('CelebrityProfile', { celebrity }),
    [navigation],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('Celebrities'),
    [navigation],
  );

  if (isError && !totalAcrossCategories) return null;
  if (!isLoading && !totalAcrossCategories) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>CELEBRITY RANKING</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {weekLabel ? `This week · ${weekLabel}` : 'This week'}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [
            styles.seeAll,
            pressed && styles.seeAllPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="See full celebrity ranking"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.segment}>
        {HOME_CATEGORY_TABS.map((tab) => {
          const active = tab.id === activeCat;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveCat(tab.id)}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${tab.label} ranking`}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  active && styles.segmentLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading && !totalAcrossCategories ? (
        <View style={styles.skeletonRow}>
          {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
            <View key={`sk-${idx}`} style={styles.skeletonCell}>
              <View style={[styles.skeleton, styles.skeletonAvatar]} />
              <View style={[styles.skeleton, styles.skeletonLine]} />
              <View style={[styles.skeleton, styles.skeletonLineShort]} />
            </View>
          ))}
        </View>
      ) : previewCelebs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No ranking for {HOME_CATEGORY_FALLBACK_LABEL[activeCat]} this week
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {previewCelebs.map((celeb) => (
            <CelebrityRankTile
              key={celeb.id}
              celeb={celeb}
              onPress={handleCelebPress}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 12,
      gap: 10,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    accentBar: {
      width: 3.5,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    titleCol: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    seeAllPressed: { opacity: 0.6 },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },

    segment: {
      flexDirection: 'row',
      marginHorizontal: 14,
      marginBottom: 14,
      borderRadius: 10,
      backgroundColor: c.surface,
      padding: 3,
      gap: 3,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: c.primary,
    },
    segmentLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.2,
    },
    segmentLabelActive: {
      color: '#FFFFFF',
    },

    row: {
      paddingHorizontal: 14,
      gap: 12,
      flexDirection: 'row',
    },

    skeletonRow: {
      paddingHorizontal: 14,
      gap: 12,
      flexDirection: 'row',
    },
    skeletonCell: {
      width: 88,
      alignItems: 'center',
    },
    skeleton: {
      backgroundColor: c.surface,
      borderRadius: 6,
    },
    skeletonAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    skeletonLine: {
      height: 11,
      width: '90%',
      marginTop: 10,
    },
    skeletonLineShort: {
      height: 9,
      width: '60%',
      marginTop: 6,
    },

    emptyWrap: {
      paddingHorizontal: 14,
      paddingVertical: 18,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textTertiary,
    },
  });
}
