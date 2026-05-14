import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VisualStoryItem } from '../data/newsStaticData';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  stories: VisualStoryItem[];
  onSeeAll?: () => void;
}

function NewsVisualStoriesSectionImpl({ stories, onSeeAll }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  if (stories.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="book-outline" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Visual Stories</Text>
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
        {stories.map((s) => (
          <Pressable
            key={s.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={[styles.thumb, { backgroundColor: s.colors[0] }]}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.emoji}>{s.emoji}</Text>
              <View style={styles.overlay}>
                <Text style={styles.cardTitle} numberOfLines={2}>{s.title}</Text>
                <Text style={styles.slides}>{s.subtitle}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const NewsVisualStoriesSection = React.memo(NewsVisualStoriesSectionImpl);
export default NewsVisualStoriesSection;

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
    scroll: { paddingHorizontal: 14, gap: 10 },
    card: { width: 110 },
    cardPressed: { opacity: 0.85 },
    thumb: {
      width: 110,
      height: 170,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressBar: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      height: 2.5,
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 2,
    },
    progressFill: {
      width: '40%',
      height: '100%',
      borderRadius: 2,
      backgroundColor: '#fff',
    },
    emoji: { fontSize: 32, marginBottom: 32 },
    overlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 8,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    cardTitle: { fontSize: 11, fontWeight: '800', color: '#fff', lineHeight: 15 },
    slides: { fontSize: 9.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  });
}
