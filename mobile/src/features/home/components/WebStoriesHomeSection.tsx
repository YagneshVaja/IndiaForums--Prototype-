import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { WebStorySummary } from '../../../services/api';
import { useWebStories } from '../../webstories/hooks/useWebStories';
import WebStoryHomeTile from './WebStoryHomeTile';

const PREVIEW_COUNT = 10;
const SKELETON_COUNT = 5;

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function WebStoriesHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, isError } = useWebStories();

  const previewStories = useMemo<WebStorySummary[]>(
    () => (data?.pages?.[0]?.stories ?? []).slice(0, PREVIEW_COUNT),
    [data],
  );

  const handleStoryPress = useCallback(
    (story: WebStorySummary) => {
      const index = previewStories.findIndex((s) => s.id === story.id);
      if (index < 0) return;
      navigation.navigate('WebStoryPlayer', {
        stories: previewStories,
        index,
      });
    },
    [navigation, previewStories],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('WebStories'),
    [navigation],
  );

  if (isError && !previewStories.length) return null;
  if (!isLoading && !previewStories.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>WEB STORIES</Text>
            <Text style={styles.subtitle}>Tap to play · auto-advances</Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [
            styles.seeAll,
            pressed && styles.seeAllPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="See all web stories"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading && !previewStories.length ? (
        <View style={styles.skeletonRow}>
          {Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
            <View key={`sk-${idx}`} style={styles.skeletonTile} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {previewStories.map((story) => (
            <WebStoryHomeTile
              key={story.id}
              story={story}
              onPress={handleStoryPress}
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

    row: {
      paddingHorizontal: 14,
      gap: 10,
      flexDirection: 'row',
    },
    skeletonRow: {
      paddingHorizontal: 14,
      gap: 10,
      flexDirection: 'row',
    },
    skeletonTile: {
      width: 118,
      aspectRatio: 9 / 16,
      borderRadius: 14,
      backgroundColor: c.surface,
    },
  });
}
