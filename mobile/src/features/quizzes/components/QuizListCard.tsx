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

function QuizListCardImpl({ quiz, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(quiz)}
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
            transition={120}
          />
        ) : (
          <Text style={styles.thumbEmoji}>{quiz.emoji}</Text>
        )}
      </LinearGradient>

      <View style={styles.info}>
        <View style={styles.topRow}>
          {quiz.categoryLabel ? (
            <Text style={styles.catBadge} numberOfLines={1}>
              {quiz.categoryLabel.toUpperCase()}
            </Text>
          ) : null}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{quiz.quizTypeName}</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{quiz.title}</Text>

        <Text style={styles.byline} numberOfLines={1}>
          {quiz.author && quiz.author !== 'IndiaForums' ? `by ${quiz.author}` : 'Team IndiaForums'}
        </Text>

        <View style={styles.stats}>
          <Text style={styles.stat}>❓ {quiz.questions} questions</Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.stat}>👥 {quiz.plays} plays</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(QuizListCardImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      marginHorizontal: 12,
      marginVertical: 5,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardPressed: { opacity: 0.75 },
    thumb: {
      width: 92,
      height: 92,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    thumbEmoji: {
      fontSize: 34,
    },
    info: {
      flex: 1,
      minHeight: 92,
      justifyContent: 'space-between',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
      flexWrap: 'wrap',
    },
    catBadge: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.5,
    },
    typeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    typeBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      lineHeight: 19,
      letterSpacing: -0.2,
    },
    byline: {
      fontSize: 11.5,
      color: c.textTertiary,
      fontWeight: '600',
      marginTop: 2,
    },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      flexWrap: 'wrap',
    },
    stat: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
    },
    statDot: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '800',
    },
  });
}
