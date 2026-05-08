import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  categoryName: string;
  quizCount: number;
  totalPlays?: number;
}

const CATEGORY_THEME: Record<string, { emoji: string; from: string; to: string }> = {
  'Movies':              { emoji: '🎬', from: '#FF6A88', to: '#9333EA' },
  'TV Shows':            { emoji: '📺', from: '#3558F0', to: '#7C3AED' },
  'Music':               { emoji: '🎵', from: '#F472B6', to: '#7C3AED' },
  'Celebrities':         { emoji: '⭐', from: '#F59E0B', to: '#EF4444' },
  'Mythology':           { emoji: '🕉️', from: '#F97316', to: '#B45309' },
  'Books & Literature':  { emoji: '📚', from: '#0EA5E9', to: '#1E3A8A' },
  'Fashion & Style':     { emoji: '👗', from: '#EC4899', to: '#8B5CF6' },
  'Sports & Fitness':    { emoji: '🏆', from: '#16A34A', to: '#065F46' },
  'Fun & Random':        { emoji: '🎲', from: '#F59E0B', to: '#7C2D12' },
  'Business & Finance':  { emoji: '📈', from: '#0F766E', to: '#0B3B36' },
  'General Knowledge':   { emoji: '🧠', from: '#6366F1', to: '#1E1B4B' },
};

const FALLBACK = { emoji: '🎯', from: '#3558F0', to: '#1E1B4B' } as const;

function CategoryHeroImpl({ categoryName, quizCount, totalPlays }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const theme = CATEGORY_THEME[categoryName] ?? FALLBACK;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[theme.from, theme.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Text style={styles.emojiBg}>{theme.emoji}</Text>

        <View style={styles.content}>
          <Text style={styles.kicker}>QUIZ COLLECTION</Text>
          <Text style={styles.title} numberOfLines={1}>
            {theme.emoji}  {categoryName}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>
                {quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}
              </Text>
            </View>
            {typeof totalPlays === 'number' && totalPlays > 0 ? (
              <View style={styles.statPill}>
                <Text style={styles.statPillText}>👥 {totalPlays.toLocaleString()} plays</Text>
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export default memo(CategoryHeroImpl);

function makeStyles(_c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    banner: {
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 16,
      overflow: 'hidden',
      minHeight: 110,
      justifyContent: 'center',
    },
    emojiBg: {
      position: 'absolute',
      right: -14,
      bottom: -22,
      fontSize: 130,
      opacity: 0.18,
    },
    content: {
      gap: 6,
    },
    kicker: {
      fontSize: 10,
      fontWeight: '900',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 1.2,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.4,
      textShadowColor: 'rgba(0,0,0,0.25)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
      flexWrap: 'wrap',
    },
    statPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    statPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
  });
}
