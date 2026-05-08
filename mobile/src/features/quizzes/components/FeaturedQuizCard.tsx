import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Quiz } from '../../../services/api';

export type FeaturedKind = 'trending' | 'fresh' | 'surprise';

interface Props {
  quiz: Quiz;
  kind?: FeaturedKind;
  onPress: (quiz: Quiz) => void;
}

const KIND_THEME: Record<FeaturedKind, { eyebrow: string; sub: string; accent: string }> = {
  trending: { eyebrow: '🔥 TRENDING',     sub: 'Most played',          accent: '#F59E0B' },
  fresh:    { eyebrow: '🌟 FRESH PICK',   sub: 'Just dropped',         accent: '#10B981' },
  surprise: { eyebrow: '🎲 TODAY’S PICK', sub: 'New every day',   accent: '#A855F7' },
};

function FeaturedQuizCardImpl({ quiz, kind = 'trending', onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const theme = KIND_THEME[kind];

  return (
    <Pressable
      onPress={() => onPress(quiz)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <LinearGradient
        colors={[quiz.gradient[0], quiz.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      >
        {quiz.thumbnail ? (
          <Image
            source={{ uri: quiz.thumbnail }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={160}
          />
        ) : (
          <Text style={styles.bgEmoji}>{quiz.emoji}</Text>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topRow}>
          <View style={[styles.kindPill, { backgroundColor: theme.accent }]}>
            <Text style={styles.kindPillText}>{theme.eyebrow}</Text>
          </View>
          {quiz.categoryLabel ? (
            <View style={styles.catPill}>
              <Text style={styles.catPillText} numberOfLines={1}>
                {quiz.categoryLabel.toUpperCase()}
              </Text>
            </View>
          ) : null}
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{quiz.quizTypeName}</Text>
          </View>
        </View>

        <View style={styles.bottomBlock}>
          <Text style={styles.subline}>{theme.sub}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {quiz.title}
          </Text>
          <Text style={styles.byline} numberOfLines={1}>
            {quiz.author && quiz.author !== 'IndiaForums' ? `by ${quiz.author}` : 'Team IndiaForums'}
          </Text>

          <View style={styles.ctaRow}>
            <View style={styles.statsBlock}>
              <Text style={styles.stat}>❓ {quiz.questions} Qs</Text>
              <Text style={styles.statDot}>·</Text>
              <Text style={styles.stat}>👥 {quiz.plays}</Text>
            </View>
            <View style={[styles.playBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.playBtnText}>▶  Play Now</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default memo(FeaturedQuizCardImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
    bg: {
      width: '100%',
      aspectRatio: 16 / 10,
      justifyContent: 'space-between',
      padding: 14,
    },
    bgEmoji: {
      position: 'absolute',
      top: '30%',
      alignSelf: 'center',
      fontSize: 80,
      opacity: 0.85,
    },
    topRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    kindPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    kindPillText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#1A1A1A',
      letterSpacing: 0.7,
    },
    catPill: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    catPillText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#1A1A1A',
      letterSpacing: 0.6,
    },
    typePill: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    typePillText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.4,
    },
    bottomBlock: {
      gap: 4,
    },
    subline: {
      fontSize: 11,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.4,
    },
    title: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.3,
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    byline: {
      fontSize: 11.5,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
    },
    ctaRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    statsBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    stat: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.92)',
    },
    statDot: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '900',
    },
    playBtn: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
    },
    playBtnText: {
      fontSize: 12.5,
      fontWeight: '900',
      color: '#1A1A1A',
      letterSpacing: 0.3,
    },
  });
}
