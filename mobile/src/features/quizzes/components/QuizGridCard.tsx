import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { Quiz } from '../../../services/api';

interface Props {
  quiz: Quiz;
  onPress: (quiz: Quiz) => void;
}

const TYPE_ACCENT: Record<Quiz['quizTypeName'], string> = {
  Trivia: '#3558F0',
  Personality: '#A855F7',
  'Range-Based': '#10B981',
};

function QuizGridCardImpl({ quiz, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const typeColor = TYPE_ACCENT[quiz.quizTypeName] ?? colors.primary;

  return (
    <Pressable
      onPress={() => onPress(quiz)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <LinearGradient
        colors={[quiz.gradient[0], quiz.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.thumb}
      >
        {quiz.thumbnail ? (
          <Image
            source={{ uri: quiz.thumbnail }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={140}
          />
        ) : (
          <Text style={styles.thumbEmoji}>{quiz.emoji}</Text>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          locations={[0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.typeChip, { backgroundColor: typeColor }]}>
          <Text style={styles.typeChipText}>{quiz.quizTypeName}</Text>
        </View>

        <View style={styles.playsBadge}>
          <Text style={styles.playsBadgeText}>👥 {quiz.plays}</Text>
        </View>
      </LinearGradient>

      <View style={styles.info}>
        {quiz.categoryLabel ? (
          <Text style={styles.cat} numberOfLines={1}>
            {quiz.categoryLabel.toUpperCase()}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>{quiz.title}</Text>

        <View style={styles.footer}>
          <Text style={styles.qCount}>❓ {quiz.questions} Qs</Text>
          <View style={styles.miniPlay}>
            <Text style={styles.miniPlayText}>▶</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(QuizGridCardImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    thumb: {
      width: '100%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbEmoji: {
      fontSize: 50,
      opacity: 0.9,
    },
    typeChip: {
      position: 'absolute',
      top: 8,
      left: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
    },
    typeChipText: {
      fontSize: 9.5,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.4,
    },
    playsBadge: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    playsBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    info: {
      padding: 10,
      gap: 4,
      minHeight: 90,
    },
    cat: {
      fontSize: 9.5,
      fontWeight: '900',
      color: c.primary,
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      lineHeight: 17,
      letterSpacing: -0.2,
    },
    footer: {
      marginTop: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    qCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
    },
    miniPlay: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#F59E0B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniPlayText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#1A1A1A',
      marginLeft: 1,
    },
  });
}
