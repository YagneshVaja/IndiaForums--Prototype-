import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { VisualStoryItem } from '../data/newsStaticData';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  stories: VisualStoryItem[];
  // Static tiles aren't backed by a real WebStorySummary id, so the press
  // handler is intentionally arg-less — the screen routes the tap to the
  // WebStories listing rather than the player.
  onStoryPress?: () => void;
  onSeeAll?: () => void;
}

// 5 segment dots match the Home tab's WebStoryHomeTile so both surfaces
// read as the same component. First dot filled = "story 1 of 5", a quiet
// hint that tapping plays a multi-slide story.
const DOT_COUNT = 5;

// Card width + gap between cards. Used as the snap interval so flicks
// always rest on a card edge — without it the rail can settle mid-card
// and crop the leading tile against the screen edge.
const CARD_WIDTH = 118;
const CARD_GAP = 10;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

function NewsVisualStoriesSectionImpl({ stories, onStoryPress, onSeeAll }: Props) {
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
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {stories.map((s) => (
          <Pressable
            key={s.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => onStoryPress?.()}
            accessibilityRole="button"
            accessibilityLabel={`Open visual story: ${s.title}`}
          >
            <View style={styles.thumb}>
              {/* Full-bleed gradient using both colors from the static
                  entry. Diagonal angle gives the tile depth — matches the
                  fallback treatment used on the Home web-story tile. */}
              <LinearGradient
                colors={s.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Top scrim — keeps the progress dots legible on lighter
                  gradients without painting a hard line. */}
              <LinearGradient
                colors={['rgba(0,0,0,0.35)', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.topScrim}
                pointerEvents="none"
              />

              <View style={styles.dots} pointerEvents="none">
                {Array.from({ length: DOT_COUNT }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === 0 && styles.dotActive]}
                  />
                ))}
              </View>

              {/* Emoji sits in the upper-middle so the bottom third stays
                  reserved for the title scrim. Wrapped in an absolutely-
                  positioned centered View so it doesn't collide with the
                  flex flow of the other absolute children. */}
              <View style={styles.emojiWrap} pointerEvents="none">
                <Text style={styles.emoji}>{s.emoji}</Text>
              </View>

              {/* Bottom scrim — soft and short so the gradient color
                  carries all the way to the bottom edge. The previous
                  height/opacity made the lower half read as a separate
                  black box, visually detaching the title from the tile. */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.bottomScrim}
                pointerEvents="none"
              />

              <View style={styles.captionWrap} pointerEvents="none">
                <Text style={styles.cardTitle} numberOfLines={2}>{s.title}</Text>
                <Text style={styles.slidesText}>{s.subtitle}</Text>
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
    scroll: { paddingHorizontal: 14, gap: CARD_GAP },
    card: { width: CARD_WIDTH },
    cardPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
    // 9:16 aspect — matches WebStoryHomeTile so both rails feel like the
    // same component. Border + inner card colour give a clean edge on both
    // light and dark themes.
    thumb: {
      width: '100%',
      aspectRatio: 9 / 16,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      position: 'relative',
    },
    topScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 56,
    },
    dots: {
      position: 'absolute',
      top: 8,
      left: 8,
      right: 8,
      flexDirection: 'row',
      gap: 3,
    },
    dot: {
      flex: 1,
      maxWidth: 22,
      height: 2.5,
      borderRadius: 1.5,
      backgroundColor: 'rgba(255,255,255,0.35)',
    },
    dotActive: {
      backgroundColor: '#fff',
    },
    // Centers the emoji in the upper ~55% of the tile. Absolute positioning
    // keeps it out of the flex flow so the bottom scrim and caption sit
    // cleanly underneath without being pushed around.
    emojiWrap: {
      position: 'absolute',
      top: 18,
      left: 0,
      right: 0,
      height: '55%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: {
      fontSize: 44,
      textShadowColor: 'rgba(0,0,0,0.25)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    bottomScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '38%',
    },
    captionWrap: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 8,
      gap: 5,
    },
    cardTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#fff',
      lineHeight: 15,
      letterSpacing: -0.2,
      // Heavier shadow lets the title sit directly on the gradient
      // without needing a hard pill or thick scrim behind it.
      textShadowColor: 'rgba(0,0,0,0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    slidesText: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.3,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
  });
}
