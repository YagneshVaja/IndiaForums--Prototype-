import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface WebStory {
  id: number;
  title: string;
  coverEmoji: string;
  coverBg: string;
  slideCount: number;
  timeAgo: string;
}

interface Props {
  stories: WebStory[];
  onSeeAll?: () => void;
  onStoryPress?: (story: WebStory, index: number) => void;
}

function firstHex(gradient: string): string {
  const match = gradient.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#3558F0';
}

export default function WebStoriesStrip({ stories, onSeeAll, onStoryPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!stories.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Web Stories</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>See All →</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {stories.map((s, i) => (
          <Pressable key={s.id} style={styles.card} onPress={() => onStoryPress?.(s, i)}>
            <View style={styles.ring}>
              <View style={[styles.cover, { backgroundColor: firstHex(s.coverBg) }]}>
                <Text style={styles.emoji}>{s.coverEmoji}</Text>
                <View style={styles.scrim} />
                <Text style={styles.cardTitle} numberOfLines={3}>{s.title}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta} numberOfLines={1}>{s.timeAgo}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingBottom: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
    title: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
    },
    seeAll: {
      fontSize: 11.5,
      fontWeight: '700',
      color: c.primary,
    },
    row: {
      paddingHorizontal: 14,
      paddingBottom: 4,
      paddingTop: 4,
      gap: 10,
      flexDirection: 'row',
    },
    card: {
      width: 104,
      gap: 6,
    },
    ring: {
      width: 104,
      height: 150,
      borderRadius: 14,
      padding: 2,
      backgroundColor: c.primary,
      overflow: 'hidden',
    },
    cover: {
      flex: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    emoji: {
      fontSize: 32,
    },
    scrim: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    cardTitle: {
      position: 'absolute',
      left: 7,
      right: 7,
      bottom: 7,
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      lineHeight: 14,
    },
    cardMeta: {
      fontSize: 10,
      color: c.textSecondary,
      fontWeight: '500',
      paddingHorizontal: 2,
    },
  });
}
