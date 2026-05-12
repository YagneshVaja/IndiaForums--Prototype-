import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import {
  fetchFanFictionDetail,
  type FanFictionChapterSummary,
  type FanFictionDetail,
} from '../../../services/api';

import ChapterRow from '../components/ChapterRow';
import StoryDetailsPanel from '../components/StoryDetailsPanel';

function useFanFictionDetail(id: string | undefined) {
  return useQuery<FanFictionDetail | null>({
    queryKey: ['fan-fiction', 'detail', id],
    queryFn: () => fetchFanFictionDetail(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FanFictionDetail'>;
type R   = RouteProp<HomeStackParamList, 'FanFictionDetail'>;
type Styles = ReturnType<typeof makeStyles>;

export default function FanFictionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const { id } = route.params;

  const { data: detail, isLoading, isError, refetch } = useFanFictionDetail(id);
  const [imgFailed, setImgFailed] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Story" onBack={() => navigation.goBack()} />
        <LoadingState />
      </View>
    );
  }

  if (isError || !detail) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Story" onBack={() => navigation.goBack()} />
        <ErrorState message="Couldn't load this story" onRetry={() => refetch()} />
      </View>
    );
  }

  const showImg = !!detail.thumbnail && !imgFailed;
  const isCompleted = detail.statusRaw === 1;
  const chapters = detail.chapters;
  const firstChapter = chapters[0];

  const openChapter = (c: FanFictionChapterSummary) => {
    navigation.navigate('ChapterReader', {
      fanFictionId: detail.id,
      chapterId: c.chapterId,
    });
  };

  const startReading = () => {
    if (firstChapter) openChapter(firstChapter);
  };

  return (
    <View style={styles.screen}>
      <TopNavBack title={detail.title} onBack={() => navigation.goBack()} />

      <FlatList
        data={chapters}
        keyExtractor={(c) => c.chapterId}
        renderItem={({ item }) => <ChapterRow chapter={item} onPress={openChapter} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={[styles.hero, { backgroundColor: detail.bg }]}>
              {showImg ? (
                <Image
                  source={{ uri: detail.thumbnail! }}
                  style={styles.heroImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <Text style={styles.heroEmoji}>📖</Text>
              )}
              <View style={styles.heroOverlay} />
              <View style={styles.heroTopRight}>
                {detail.rating ? (
                  <View style={styles.ratingPill}>
                    <Text style={styles.ratingText}>{detail.rating}</Text>
                  </View>
                ) : null}
                <View style={[styles.statusPill, isCompleted ? styles.statusComplete : styles.statusOngoing]}>
                  <Text style={styles.statusText}>{detail.status}</Text>
                </View>
              </View>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle} numberOfLines={3}>{detail.title}</Text>
                <Text style={styles.heroAuthor}>by {detail.author}</Text>
              </View>
            </View>

            <View style={styles.statsStrip}>
              <Stat styles={styles} primary={colors.primary} icon="book-outline" label="Chapters" value={String(detail.chapterCount)} />
              <View style={styles.statDivider} />
              <Stat styles={styles} primary={colors.primary} icon="eye-outline" label="Views" value={detail.views} />
              <View style={styles.statDivider} />
              <Stat styles={styles} primary={colors.primary} icon="heart-outline" label="Likes" value={detail.likes} />
              <View style={styles.statDivider} />
              <Stat styles={styles} primary={colors.primary} icon="people-outline" label="Followers" value={detail.followers} />
            </View>

            {firstChapter ? (
              <Pressable
                onPress={startReading}
                style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
              >
                <Ionicons name="book" size={15} color="#FFFFFF" />
                <Text style={styles.startBtnText}>Start reading</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </Pressable>
            ) : null}

            <StoryDetailsPanel detail={detail} />

            <View style={styles.chaptersHeader}>
              <Text style={styles.chaptersTitle}>Chapters</Text>
              <Text style={styles.chaptersCount}>{chapters.length}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chapters published yet.</Text>
          </View>
        }
      />
    </View>
  );
}

function Stat({
  styles,
  primary,
  icon,
  label,
  value,
}: {
  styles: Styles;
  primary: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={13} color={primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    listContent: { paddingBottom: 32 },
    hero: {
      height: 220,
      marginHorizontal: 12,
      marginTop: 12,
      borderRadius: 14,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroImg: { position: 'absolute', width: '100%', height: '100%' },
    heroEmoji: { fontSize: 72 },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
    heroTopRight: {
      position: 'absolute',
      top: 12,
      right: 12,
      alignItems: 'flex-end',
      gap: 6,
    },
    ratingPill: {
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    ratingText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
    statusOngoing: { backgroundColor: 'rgba(59, 130, 246, 0.88)' },
    statusComplete: { backgroundColor: 'rgba(16, 185, 129, 0.88)' },
    statusText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
    heroContent: { position: 'absolute', left: 14, right: 14, bottom: 14 },
    heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', lineHeight: 24, marginBottom: 4 },
    heroAuthor: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
    statsStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: c.card,
      borderRadius: 10,
      paddingVertical: 12,
      marginHorizontal: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    statItem: { alignItems: 'center', gap: 2, flex: 1 },
    statValue: { fontSize: 14, fontWeight: '800', color: c.text },
    statLabel: {
      fontSize: 9,
      color: c.textTertiary,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    statDivider: { width: 1, height: 32, backgroundColor: c.border },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      marginHorizontal: 12,
      marginTop: 12,
      paddingVertical: 13,
      borderRadius: 10,
    },
    startBtnPressed: { opacity: 0.9 },
    startBtnText: { color: c.onPrimary, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
    chaptersHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
    chaptersTitle: { fontSize: 15, fontWeight: '800', color: c.text },
    chaptersCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      backgroundColor: c.surface,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
    },
    empty: { padding: 32, alignItems: 'center' },
    emptyText: { color: c.textTertiary, fontSize: 14 },
  });
}
