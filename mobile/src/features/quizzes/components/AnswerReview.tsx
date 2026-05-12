import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { QuizQuestion } from '../../../services/api';

interface ReviewAnswer {
  questionId: number;
  optionIdx: number;
  correct: boolean;
}

interface Props {
  questions: QuizQuestion[];
  answers: ReviewAnswer[];
}

/**
 * Per-question review — shows each question, the user's pick, and the correct
 * answer when wrong. Trivia-only (personality has no "correct" answer).
 */
export default function AnswerReview({ questions, answers }: Props) {
  const styles = useThemedStyles(makeStyles);

  const byId = useMemo(() => {
    const m: Record<number, ReviewAnswer> = {};
    for (const a of answers) m[a.questionId] = a;
    return m;
  }, [answers]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Answer Review</Text>
      {questions.map((q, qi) => {
        const a = byId[q.questionId];
        const skipped = !a;
        const correct = a?.correct === true;
        const pickedIdx = a?.optionIdx ?? -1;

        return (
          <View
            key={q.questionId}
            style={[
              styles.card,
              correct ? styles.cardCorrect : (skipped ? styles.cardSkipped : styles.cardWrong),
            ]}
          >
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.badge,
                  correct ? styles.badgeCorrect : (skipped ? styles.badgeSkipped : styles.badgeWrong),
                ]}
              >
                <Text style={styles.badgeText}>
                  {correct ? '✓' : skipped ? '—' : '✗'}
                </Text>
              </View>
              <Text style={styles.qNum}>Q{qi + 1}</Text>
              <Text
                style={[
                  styles.statusText,
                  correct ? styles.statusCorrect : (skipped ? styles.statusSkipped : styles.statusWrong),
                ]}
              >
                {correct ? 'Correct' : skipped ? 'Skipped' : 'Wrong'}
              </Text>
            </View>

            <Text style={styles.question}>{q.question}</Text>

            <View style={styles.answers}>
              {!skipped ? (
                <View style={styles.answerRow}>
                  <Text style={styles.answerLabel}>Your answer</Text>
                  <Text
                    style={[
                      styles.answerText,
                      correct ? styles.answerCorrect : styles.answerWrong,
                    ]}
                  >
                    {q.options[pickedIdx] ?? '—'}
                  </Text>
                </View>
              ) : null}

              {!correct ? (
                <View style={styles.answerRow}>
                  <Text style={styles.answerLabel}>Correct answer</Text>
                  <Text style={[styles.answerText, styles.answerCorrect]}>
                    {q.options[q.correct] ?? '—'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 10,
    },
    title: {
      fontSize: 15,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.3,
      marginTop: 4,
      marginBottom: 4,
    },

    card: {
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    cardCorrect: { borderColor: '#16a34a', backgroundColor: '#F0FDF4' },
    cardWrong:   { borderColor: '#dc2626', backgroundColor: '#FEF2F2' },
    cardSkipped: { borderColor: c.border, backgroundColor: c.surface },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeCorrect: { backgroundColor: '#16a34a' },
    badgeWrong:   { backgroundColor: '#dc2626' },
    badgeSkipped: { backgroundColor: c.textTertiary },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    qNum: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    statusText: {
      marginLeft: 'auto',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    statusCorrect: { color: '#15803D' },
    statusWrong:   { color: '#B91C1C' },
    statusSkipped: { color: c.textTertiary },

    question: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 19,
      letterSpacing: -0.2,
    },

    answers: {
      gap: 5,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
      paddingTop: 8,
    },
    answerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    answerLabel: {
      width: 110,
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.3,
      paddingTop: 1,
    },
    answerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    answerCorrect: { color: '#15803D' },
    answerWrong:   { color: '#B91C1C' },
  });
}
