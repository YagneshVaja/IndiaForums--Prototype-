import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Gallery {
  id: number;
  title: string;
  emoji: string;
  bg: string;
  count: number;
}

interface Props {
  galleries: Gallery[];
  onSeeAll?: () => void;
  onGalleryPress?: (gallery: Gallery) => void;
}

function firstHex(gradient: string): string {
  const match = gradient.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#E8E8E8';
}

export default function PhotoGallerySection({ galleries, onSeeAll, onGalleryPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Photo Galleries</Text>
        </View>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See All →</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {galleries.map(g => (
          <Pressable key={g.id} style={styles.card} onPress={() => onGalleryPress?.(g)}>
            <View style={[styles.thumb, { backgroundColor: firstHex(g.bg) }]}>
              <Text style={styles.emoji}>{g.emoji}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{g.count}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{g.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingVertical: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingBottom: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
    scroll: {
      paddingHorizontal: 14,
      gap: 10,
      flexDirection: 'row',
    },
    card: {
      width: 120,
    },
    thumb: {
      width: 120,
      height: 120,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 7,
      overflow: 'hidden',
    },
    emoji: {
      fontSize: 34,
    },
    countBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    countText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    cardTitle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 16,
    },
  });
}
