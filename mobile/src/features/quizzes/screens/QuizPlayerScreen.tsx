import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { extractApiError, submitQuizResponse, type SubmitAnswer } from '../../../services/api';
import { useQuizDetails } from '../hooks/useQuizzes';
import CircularTimer from '../components/CircularTimer';

// ── Inline haptic helpers ─────────────────────────────────────────────────
// Kept inline to avoid creating a new module folder (Metro on Windows
// occasionally misses newly-added sibling dirs even with --clear).
function hapticTap() {
  if (Platform.OS === 'android') Vibration.vibrate(10);
  else Vibration.vibrate();
}
function hapticCorrect() {
  Vibration.vibrate([0, 30, 60, 30]);
}
function hapticWrong() {
  Vibration.vibrate(80);
}
function hapticTimeout() {
  Vibration.vibrate(100);
}
function hapticFinish() {
  Vibration.vibrate([0, 25, 40, 25, 40, 40]);
}

type Nav = NativeStackNavigationProp<HomeStackParamList, 'QuizPlayer'>;
type Rt  = RouteProp<HomeStackParamList, 'QuizPlayer'>;

interface AnsweredEntry {
  optionIdx: number;
  optionId: number;
  correct: boolean;
  points: number;
  questionId: number;
}

export default function QuizPlayerScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { id } = params;

  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: quiz, isLoading, isError, error, refetch } = useQuizDetails(id);

  const questions = quiz?.quiz_questions ?? [];
  const totalQ = questions.length;
  const timerDuration = quiz?.countdownTimer || 0;

  const [qIdx, setQIdx] = useState(0);
  const [answered, setAnswered] = useState<Record<number, AnsweredEntry>>({});
  const [showReveal, setShowReveal] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timerDuration);
  const [submitting, setSubmitting] = useState(false);

  const answeredRef = useRef<Record<number, AnsweredEntry>>({});
  const qIdxRef = useRef(0);
  qIdxRef.current = qIdx;
  const goNextRef = useRef<() => void>(() => {});
  const finishedRef = useRef(false);

  const currentQ = questions[qIdx];
  const currentAnswer = answered[qIdx] ?? null;
  const isAnswered = currentAnswer !== null;

  const answeredList = useMemo(() => Object.values(answered), [answered]);
  const triviaScore = answeredList.filter((a) => a.correct).length;

  // ── Reanimated: transition body on each question change ────────────────
  const bodyOpacity     = useSharedValue(1);
  const bodyTranslate   = useSharedValue(0);
  const prevQIdx        = useRef(qIdx);
  useEffect(() => {
    if (prevQIdx.current === qIdx) return;
    prevQIdx.current = qIdx;
    bodyOpacity.value = 0;
    bodyTranslate.value = 24;
    bodyOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    bodyTranslate.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [qIdx, bodyOpacity, bodyTranslate]);
  const bodyAnimStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
    transform: [{ translateX: bodyTranslate.value }],
  }));

  // ── Reanimated: pulse score pill when score goes up ────────────────────
  const scoreScale = useSharedValue(1);
  const prevScore = useRef(triviaScore);
  useEffect(() => {
    if (triviaScore > prevScore.current) {
      scoreScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 180 }),
        withSpring(1,   { damping: 8, stiffness: 200 }),
      );
    }
    prevScore.current = triviaScore;
  }, [triviaScore, scoreScale]);
  const scorePillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const finish = useCallback(async (finalMap: Record<number, AnsweredEntry>) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    hapticFinish();
    setSubmitting(true);
    const payload: SubmitAnswer[] = Object.values(finalMap)
      .filter((a) => a.optionId > 0)
      .map((a) => ({ questionId: a.questionId, optionId: a.optionId }));

    let localScore = 0;
    Object.values(finalMap).forEach((a) => {
      if (questions[0]?.isTrivia) {
        if (a.correct) localScore += 10;
      } else {
        localScore += a.points || 0;
      }
    });

    await submitQuizResponse(id, payload);
    setSubmitting(false);
    navigation.replace('QuizResult', {
      id: String(id),
      score: localScore,
      // Pass the answered map so the result screen can show a per-question review
      answers: Object.values(finalMap).map((a) => ({
        questionId: a.questionId,
        optionIdx:  a.optionIdx,
        correct:    a.correct,
      })),
    });
  }, [id, navigation, questions]);

  const goNext = useCallback(() => {
    setShowReveal(false);
    const next = qIdxRef.current + 1;
    if (next >= totalQ) {
      finish(answeredRef.current);
      return;
    }
    setQIdx(next);
  }, [totalQ, finish]);

  goNextRef.current = goNext;

  const handlePick = useCallback((optionIdx: number) => {
    if (!currentQ || isAnswered) return;

    const isCorrect = currentQ.isTrivia ? optionIdx === currentQ.correct : false;
    const entry: AnsweredEntry = {
      optionIdx,
      optionId: currentQ.optionIds[optionIdx] ?? 0,
      correct: isCorrect,
      points: currentQ.points[optionIdx] ?? 0,
      questionId: currentQ.questionId,
    };

    const newMap = { ...answeredRef.current, [qIdxRef.current]: entry };
    answeredRef.current = newMap;
    setAnswered(newMap);

    // Haptics: strong feedback for trivia result, light tap for personality
    if (currentQ.isTrivia) {
      if (isCorrect) hapticCorrect();
      else hapticWrong();
    } else {
      hapticTap();
    }

    if (!currentQ.isTrivia) {
      // Personality / range-based: briefly highlight then auto-advance
      const answeredAt = qIdxRef.current;
      setTimeout(() => {
        if (qIdxRef.current === answeredAt) goNextRef.current();
      }, 700);
      return;
    }

    // Trivia: show reveal panel if content exists
    if (currentQ.revealTitle || currentQ.revealDescription || currentQ.revealImageUrl) {
      setTimeout(() => setShowReveal(true), 450);
    }
  }, [currentQ, isAnswered]);

  // Timer — resets on new question, stops when answered
  useEffect(() => {
    if (!timerDuration || isAnswered) return;
    setSecondsLeft(timerDuration);
    const interval = setInterval(() => {
      setSecondsLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          hapticTimeout();
          goNextRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qIdx, timerDuration, isAnswered]);

  const handleExit = () => {
    Alert.alert(
      'Quit quiz?',
      'Your progress will be lost.',
      [
        { text: 'Keep playing', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  };

  if (isLoading && !quiz) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if ((isError || !quiz || totalQ === 0) && !isLoading) {
    const msg = isError
      ? extractApiError(error, "Couldn't load quiz questions.")
      : "This quiz has no questions yet.";
    return (
      <View style={styles.screen}>
        <ErrorState message={msg} onRetry={isError ? () => refetch() : undefined} />
      </View>
    );
  }

  if (!quiz || !currentQ) return null;

  const isTrivia = currentQ.isTrivia;
  const progress = ((qIdx + (isAnswered ? 1 : 0)) / totalQ) * 100;
  const gradient = quiz.gradient;

  return (
    <View style={styles.screen}>
      {/* Top progress bar */}
      <View style={[styles.progressBar, { marginTop: insets.top }]}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Gradient header with question */}
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <Pressable onPress={handleExit} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.counter}>
            {qIdx + 1} / {totalQ}
          </Text>

          {timerDuration > 0 && !isAnswered ? (
            <CircularTimer secondsLeft={secondsLeft} duration={timerDuration} />
          ) : isTrivia ? (
            <Animated.View style={[styles.scorePill, scorePillAnimStyle]}>
              <Text style={styles.scorePillText}>★ {triviaScore}</Text>
            </Animated.View>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <Text style={styles.question}>{currentQ.question}</Text>

        {/* Feedback badge */}
        {isAnswered && isTrivia ? (
          <View
            style={[
              styles.feedbackBadge,
              currentAnswer!.correct ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}
          >
            <Text style={styles.feedbackText}>
              {currentAnswer!.correct ? '✓ Correct!' : '✗ Wrong'}
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Body — animated fade + slide on each new question */}
      <Animated.ScrollView
        key={qIdx}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        style={bodyAnimStyle}
      >
        {/* Question image (GIF / photo) */}
        {currentQ.questionImageUrl ? (
          <View style={styles.qImgWrap}>
            <Image
              source={{ uri: currentQ.questionImageUrl }}
              style={styles.qImg}
              contentFit="cover"
              transition={150}
            />
            {currentQ.questionImageCredit ? (
              <Text style={styles.qImgCredit}>{currentQ.questionImageCredit}</Text>
            ) : null}
          </View>
        ) : null}

        {currentQ.options.map((opt, i) => {
          const selectedIdx = currentAnswer?.optionIdx ?? -1;
          const isSelected = i === selectedIdx;
          const isCorrect = isTrivia && i === currentQ.correct;

          let optStyle = styles.option;
          let letterStyle = styles.letter;
          let textStyle = styles.optionText;
          let filled = false;

          if (isAnswered && isTrivia) {
            if (isCorrect) {
              optStyle = { ...styles.option, ...styles.optionCorrect };
              letterStyle = { ...styles.letter, ...styles.letterFilled };
              filled = true;
            } else if (isSelected) {
              optStyle = { ...styles.option, ...styles.optionWrong };
              letterStyle = { ...styles.letter, ...styles.letterFilled };
              filled = true;
            } else {
              optStyle = { ...styles.option, ...styles.optionDim };
            }
          } else if (isAnswered && !isTrivia) {
            if (isSelected) {
              optStyle = { ...styles.option, ...styles.optionSelected };
              letterStyle = { ...styles.letter, ...styles.letterFilled };
              filled = true;
            } else {
              optStyle = { ...styles.option, ...styles.optionDim };
            }
          }

          if (filled) textStyle = { ...styles.optionText, color: '#FFFFFF' };

          return (
            <Pressable
              key={`${currentQ.questionId}-${i}`}
              style={({ pressed }) => [optStyle, pressed && !isAnswered && styles.optionPressed]}
              onPress={() => handlePick(i)}
              disabled={isAnswered}
            >
              <View style={letterStyle}>
                <Text
                  style={[
                    styles.letterText,
                    filled && styles.letterTextFilled,
                  ]}
                >
                  {String.fromCharCode(65 + i)}
                </Text>
              </View>
              <Text style={textStyle}>{opt}</Text>
              {isTrivia && isAnswered && isCorrect ? (
                <Text style={styles.tick}>✓</Text>
              ) : null}
              {isTrivia && isAnswered && isSelected && !isCorrect ? (
                <Text style={styles.cross}>✗</Text>
              ) : null}
            </Pressable>
          );
        })}

        {/* Reveal panel */}
        {showReveal && (currentQ.revealTitle || currentQ.revealDescription || currentQ.revealImageUrl) ? (
          <View style={styles.reveal}>
            {currentQ.revealImageUrl ? (
              <Image
                source={{ uri: currentQ.revealImageUrl }}
                style={styles.revealImg}
                contentFit="cover"
                transition={150}
              />
            ) : null}
            {currentQ.revealTitle ? (
              <Text style={styles.revealTitle}>{currentQ.revealTitle}</Text>
            ) : null}
            {currentQ.revealDescription ? (
              <Text style={styles.revealDesc}>{currentQ.revealDescription}</Text>
            ) : null}
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* Next button — only for trivia (personality auto-advances) */}
      {isAnswered && isTrivia ? (
        <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
          <Pressable
            onPress={goNext}
            disabled={submitting}
            style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextBtnText}>
                {qIdx + 1 < totalQ ? 'Next Question →' : 'See Results →'}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    progressBar: {
      height: 3,
      backgroundColor: c.border,
    },
    progressFill: {
      height: 3,
      backgroundColor: c.primary,
    },

    header: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 18,
      gap: 10,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    counter: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      opacity: 0.95,
    },
    scorePill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.28)',
    },
    scorePillText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    question: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      lineHeight: 26,
      letterSpacing: -0.3,
      marginTop: 6,
    },

    feedbackBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      marginTop: 4,
    },
    feedbackCorrect: { backgroundColor: '#16a34a' },
    feedbackWrong:   { backgroundColor: '#dc2626' },
    feedbackText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
    },

    body: {
      padding: 16,
      paddingBottom: 120,
      gap: 10,
    },

    qImgWrap: {
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: c.surface,
      marginBottom: 6,
    },
    qImg: {
      width: '100%',
      aspectRatio: 16 / 9,
    },
    qImgCredit: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },

    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    optionPressed:  { opacity: 0.7 },
    optionSelected: { backgroundColor: c.primary, borderColor: c.primary },
    optionCorrect:  { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    optionWrong:    { backgroundColor: '#dc2626', borderColor: '#dc2626' },
    optionDim:      { opacity: 0.45 },

    letter: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    letterFilled: { backgroundColor: 'rgba(255,255,255,0.25)' },
    letterText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textSecondary,
    },
    letterTextFilled: { color: '#FFFFFF' },

    optionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      lineHeight: 20,
    },
    tick:  { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },
    cross: { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },

    reveal: {
      marginTop: 8,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      gap: 6,
    },
    revealImg: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: 8,
      backgroundColor: c.border,
    },
    revealTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
    },
    revealDesc: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
    },

    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    nextBtn: {
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
    },
    nextBtnPressed: { opacity: 0.82 },
    nextBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
  });
}
