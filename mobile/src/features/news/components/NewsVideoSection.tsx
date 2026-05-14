import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Video } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  videos: Video[];
  onVideoPress?: (video: Video) => void;
  onSeeAll?: () => void;
}

function NewsVideoSectionImpl({ videos, onVideoPress, onSeeAll }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  if (videos.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="play-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Videos</Text>
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>See All →</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {videos.slice(0, 4).map((v) => (
          <Pressable
            key={v.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => onVideoPress?.(v)}
          >
            <View style={styles.thumb}>
              {v.thumbnail ? (
                <Image
                  source={{ uri: v.thumbnail }}
                  style={styles.thumbImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.thumbImg, styles.thumbFallback]}>
                  <Text style={styles.fallbackEmoji}>{v.emoji}</Text>
                </View>
              )}
              <View style={styles.playOverlay}>
                <View style={styles.playBtn}>
                  <Ionicons name="play" size={12} color="#fff" />
                </View>
              </View>
              {v.duration ? (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{v.duration}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{v.title}</Text>
            <Text style={styles.views}>
              {v.views ? `${v.views} views` : (v.timeAgo ?? '')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// Memoized so a parent re-render (e.g. the news feed appending another article
// page) doesn't re-render every rail. Props are reference-stable from the
// assembler when their underlying slot hasn't changed.
const NewsVideoSection = React.memo(NewsVideoSectionImpl);
export default NewsVideoSection;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      paddingVertical: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginVertical: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    seeAll: { fontSize: 12, fontWeight: '700', color: c.primary },
    scroll: { paddingHorizontal: 14, gap: 12 },
    card: { width: 140 },
    cardPressed: { opacity: 0.85 },
    thumb: {
      width: 140,
      height: 90,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: c.surface,
      marginBottom: 7,
      position: 'relative',
    },
    thumbImg: { width: '100%', height: '100%' },
    thumbFallback: {
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackEmoji: { fontSize: 28 },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
    playBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    durationText: { fontSize: 9.5, fontWeight: '700', color: '#fff' },
    cardTitle: { fontSize: 12, fontWeight: '700', color: c.text, lineHeight: 17 },
    views: { fontSize: 11, color: c.textTertiary, marginTop: 3 },
  });
}
