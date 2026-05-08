import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Video } from '../../../services/api';
import { useVideos } from '../../videos/hooks/useVideos';
import VideoGridTile from './VideoGridTile';

const PREVIEW_COUNT = 4;

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

function pickPreview(videos: Video[]): Video[] {
  const featured = videos.filter((v) => v.featured);
  const source = featured.length >= PREVIEW_COUNT ? featured : videos;
  return source.slice(0, PREVIEW_COUNT);
}

export default function VideosHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, isError } = useVideos(null);

  const allVideos = useMemo<Video[]>(
    () => (data?.pages ?? []).flatMap((p) => p.videos),
    [data],
  );
  const preview = useMemo(() => pickPreview(allVideos), [allVideos]);

  const handlePress = useCallback(
    (video: Video) => navigation.navigate('VideoDetail', { video }),
    [navigation],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('Videos'),
    [navigation],
  );

  if (isError && !preview.length) return null;
  if (!isLoading && !preview.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>VIDEOS</Text>
            <Text style={styles.subtitle}>Latest from across the platform</Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [styles.seeAll, pressed && styles.seeAllPressed]}
          accessibilityRole="button"
          accessibilityLabel="See all videos"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {isLoading && !preview.length
          ? Array.from({ length: PREVIEW_COUNT }).map((_, idx) => (
              <View key={`sk-${idx}`} style={styles.cell}>
                <View style={[styles.skeleton, styles.skeletonThumb]} />
                <View style={[styles.skeleton, styles.skeletonLine]} />
                <View style={[styles.skeleton, styles.skeletonLineShort]} />
              </View>
            ))
          : preview.map((video) => (
              <View key={video.id} style={styles.cell}>
                <VideoGridTile video={video} onPress={handlePress} />
              </View>
            ))}
      </View>
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
      paddingBottom: 14,
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

    grid: {
      paddingHorizontal: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    cell: {
      width: '48%',
    },

    skeleton: {
      backgroundColor: c.surface,
      borderRadius: 6,
    },
    skeletonThumb: {
      aspectRatio: 16 / 9,
      borderRadius: 12,
      marginBottom: 8,
    },
    skeletonLine: {
      height: 11,
      width: '90%',
      marginTop: 4,
    },
    skeletonLineShort: {
      height: 9,
      width: '50%',
      marginTop: 6,
    },
  });
}
