import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { QuizItem } from '../data/newsStaticData';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

const OPT_LABELS = ['A', 'B', 'C', 'D'] as const;

interface Props {
  quiz: QuizItem;
}

function NewsQuizSectionImpl({ quiz }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [selected, setSelected] = useState<number | null>(null);

  const answered = selected !== null;

  function pick(i: number) {
    if (answered) return;
    setSelected(i);
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.quizIcon}>🎯</Text>
          <Text style={styles.sectionTitle}>Quiz Time</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{quiz.badge}</Text>
          </View>
        </View>
        <Text style={styles.participants}>{quiz.participants} played</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>{quiz.question}</Text>

        <View style={styles.grid}>
          {quiz.options.map((opt, i) => {
            const isCorrect = i === quiz.answer;
            const isSelected = i === selected;
            return (
              <Pressable
                key={i}
                style={[
                  styles.opt,
                  answered && isCorrect && styles.optCorrect,
                  answered && isSelected && !isCorrect && styles.optWrong,
                  answered && !isCorrect && !isSelected && styles.optDim,
                ]}
                onPress={() => pick(i)}
              >
                <View style={[
                  styles.optLabelWrap,
                  answered && isCorrect && styles.optLabelCorrect,
                  answered && isSelected && !isCorrect && styles.optLabelWrong,
                ]}>
                  <Text style={styles.optLabel}>{OPT_LABELS[i]}</Text>
                </View>
                <Text style={styles.optText} numberOfLines={2}>{opt}</Text>
                {answered && isCorrect ? <Text style={styles.tick}>✓</Text> : null}
                {answered && isSelected && !isCorrect ? <Text style={styles.cross}>✗</Text> : null}
              </Pressable>
            );
          })}
        </View>

        {answered ? (
          <View style={[
            styles.result,
            selected === quiz.answer ? styles.resultCorrect : styles.resultWrong,
          ]}>
            <Text style={styles.resultText}>
              {selected === quiz.answer
                ? '🎉 Correct! You got it right!'
                : `❌ Oops! Answer: ${quiz.options[quiz.answer]}`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// Memoized so the rest of the feed re-rendering doesn't reset the user's
// selected option (component's internal useState would survive memo anyway,
// but the memo additionally skips the heavier render+style work for unchanged
// quizzes during scroll).
const NewsQuizSection = React.memo(NewsQuizSectionImpl);
export default NewsQuizSection;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      paddingVertical: 14,
      paddingHorizontal: 14,
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
      marginBottom: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    quizIcon: { fontSize: 15 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    badge: {
      backgroundColor: c.primarySoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeText: { fontSize: 9.5, fontWeight: '800', color: c.primary, letterSpacing: 0.3 },
    participants: { fontSize: 11, color: c.textTertiary, fontWeight: '600' },

    card: {
      backgroundColor: c.bg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    question: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      lineHeight: 21,
      marginBottom: 14,
    },
    grid: { gap: 8 },

    opt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 11,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    optCorrect: { backgroundColor: '#DCFCE7', borderColor: '#16a34a' },
    optWrong:   { backgroundColor: '#FEE2E2', borderColor: '#dc2626' },
    optDim:     { opacity: 0.45 },

    optLabelWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optLabelCorrect: { backgroundColor: '#16a34a' },
    optLabelWrong:   { backgroundColor: '#dc2626' },
    optLabel: { fontSize: 11, fontWeight: '800', color: c.textSecondary },
    optText:  { flex: 1, fontSize: 13, fontWeight: '600', color: c.text },
    tick:  { fontSize: 14, color: '#16a34a', fontWeight: '800' },
    cross: { fontSize: 14, color: '#dc2626', fontWeight: '800' },

    result: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
    },
    resultCorrect: { backgroundColor: '#DCFCE7' },
    resultWrong:   { backgroundColor: '#FEE2E2' },
    resultText: { fontSize: 13, fontWeight: '700', color: c.text, textAlign: 'center' },
  });
}
