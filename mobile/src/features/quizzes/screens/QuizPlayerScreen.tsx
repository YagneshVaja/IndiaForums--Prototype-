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
  FadeInDown,
} from 'react-native-reanimated';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { extractApiError, submitQuizResponse } from '../../../services/api';
import { useQuizDetails } from '../hooks/useQuizzes';
import CircularTimer from '../components/CircularTimer';
import ConfettiBurst from '../components/ConfettiBurst';

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
  const user   = useAuthStore((s) => s.user);
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
  // Bumped on each correct trivia answer so ConfettiBurst re-mounts and replays.
  const [confettiKey, setConfettiKey] = useState(0);

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

    const isTriviaQuiz = !!questions[0]?.isTrivia;

    let totalPoints = 0;
    Object.values(finalMap).forEach((a) => {
      if (isTriviaQuiz) {
        if (a.correct) totalPoints += 10;
      } else {
        totalPoints += a.points || 0;
      }
    });

    // Personality quizzes need finalResultForUser = matched result range's id.
    // Trivia has no result ranges → 0.
    let finalResultForUser = 0;
    if (!isTriviaQuiz && quiz) {
      const matched = quiz.results.find(
        (r) => totalPoints >= r.lowerRange && totalPoints <= r.upperRange,
      ) || quiz.results[0];
      finalResultForUser = matched?.resultId ?? 0;
    }

    const submitResult = quiz && user
      ? await submitQuizResponse(id, {
          quizTypeId:         quiz.quizTypeId,
          userName:           user.userName || '',
          userEmail:          user.email || '',
          totalPointsScored:  totalPoints,
          finalResultForUser,
        })
      : null;

    setSubmitting(false);
    navigation.replace('QuizResult', {
      id: String(id),
      score: totalPoints,
      answers: Object.values(finalMap).map((a) => ({
        questionId: a.questionId,
        optionIdx:  a.optionIdx,
        correct:    a.correct,
      })),
      server: submitResult
        ? {
            percentageBelow:    submitResult.percentageBelow,
            totalCount:         submitResult.totalCount,
            totalUserPoints:    submitResult.totalUserPoints,
            finalResultForUser: submitResult.finalResultForUser,
          }
        : null,
    });
  }, [id, navigation, questions, quiz, user]);

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
      if (isCorrect) {
        hapticCorrect();
        setConfettiKey((k) => k + 1);
      } else {
        hapticWrong();
      }
    } else {
      hapticTap();
    }

    // Reveal panel — works for both trivia and personality, gated on the
    // explicit doReveal flag plus the presence of any reveal content.
    const hasRevealContent = !!(
      currentQ.revealTitle || currentQ.revealDescription || currentQ.revealImageUrl
    );
    if (currentQ.doReveal && hasRevealContent) {
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

      {/* Gradient header with question. Decorative emoji watermark fills the
          empty visual space when the question has no GIF/image. */}
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, !currentQ.questionImageUrl && styles.headerTall]}
      >
        {!currentQ.questionImageUrl ? (
          <Text style={styles.heroEmoji} pointerEvents="none">
            {quiz.emoji}
          </Text>
        ) : null}

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

        {quiz.categoryLabel ? (
          <View style={styles.heroCatRow}>
            <View style={styles.heroCatBadge}>
              <Text style={styles.heroCatBadgeText}>{quiz.categoryLabel.toUpperCase()}</Text>
            </View>
            <View style={styles.heroTypeBadge}>
              <Text style={styles.heroTypeBadgeText}>
                {isTrivia ? '🧠 TRIVIA' : '✨ PERSONALITY'}
              </Text>
            </View>
          </View>
        ) : null}

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

        {confettiKey > 0 ? (
          <View style={styles.confettiOverlay} pointerEvents="none">
            <ConfettiBurst key={confettiKey} count={18} durationMs={1800} />
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

        {/* Adaptive option layout — grid when all options have images (trivia,
            ≤4 opts) AND the API hint doesn't force a list. answerLayoutTypeId
            comes from the server as an undocumented enum; we treat 1 as
            "force list" (the most common convention) and any other value as
            "no preference, use client adaptive logic". */}
        {(() => {
          const allHaveImages = currentQ.optionImageUrls.every(Boolean);
          const apiForcesList = currentQ.answerLayoutTypeId === 1;
          const useGrid =
            isTrivia &&
            allHaveImages &&
            currentQ.options.length <= 4 &&
            !apiForcesList;
          const selectedIdx = currentAnswer?.optionIdx ?? -1;

          const visualState = (i: number) => {
            const isSelected = i === selectedIdx;
            const isCorrect = isTrivia && i === currentQ.correct;
            let bg = styles.optionNeutralBg;
            let border = styles.optionNeutralBorder;
            let dim = false;
            let filled = false;

            if (isAnswered && isTrivia) {
              if (isCorrect) {
                bg = styles.optionCorrectBg;
                border = styles.optionCorrectBorder;
                filled = true;
              } else if (isSelected) {
                bg = styles.optionWrongBg;
                border = styles.optionWrongBorder;
                filled = true;
              } else {
                dim = true;
              }
            } else if (isAnswered && !isTrivia) {
              if (isSelected) {
                bg = styles.optionSelectedBg;
                border = styles.optionSelectedBorder;
                filled = true;
              } else {
                dim = true;
              }
            }
            return { isSelected, isCorrect, bg, border, dim, filled };
          };

          if (useGrid) {
            return (
              <View style={styles.gridWrap}>
                {currentQ.options.map((opt, i) => {
                  const v = visualState(i);
                  const showTick  = isTrivia && isAnswered && v.isCorrect;
                  const showCross = isTrivia && isAnswered && v.isSelected && !v.isCorrect;
                  return (
                    <Animated.View
                      key={`${currentQ.questionId}-${i}`}
                      entering={FadeInDown.delay(i * 70).duration(260)}
                      style={styles.gridCardWrap}
                    >
                    <Pressable
                      style={({ pressed }) => [
                        styles.gridCard,
                        v.border,
                        v.dim && styles.optionDim,
                        pressed && !isAnswered && styles.optionPressed,
                      ]}
                      onPress={() => handlePick(i)}
                      disabled={isAnswered}
                    >
                      <View style={styles.gridImgWrap}>
                        <Image
                          source={{ uri: currentQ.optionImageUrls[i] ?? '' }}
                          style={styles.gridImg}
                          contentFit="cover"
                          transition={150}
                        />
                        {showTick ? (
                          <View style={[styles.gridOverlayBadge, styles.gridBadgeCorrect]}>
                            <Text style={styles.gridBadgeText}>✓</Text>
                          </View>
                        ) : null}
                        {showCross ? (
                          <View style={[styles.gridOverlayBadge, styles.gridBadgeWrong]}>
                            <Text style={styles.gridBadgeText}>✗</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={[styles.gridFooter, v.bg]}>
                        <View style={[styles.letter, v.filled && styles.letterFilled]}>
                          <Text style={[styles.letterText, v.filled && styles.letterTextFilled]}>
                            {String.fromCharCode(65 + i)}
                          </Text>
                        </View>
                        <View style={styles.gridTextCol}>
                          <Text
                            style={[styles.gridText, v.filled && styles.optionTextFilled]}
                            numberOfLines={2}
                          >
                            {opt}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            );
          }

          // Inline rows — text-only or partial-image
          return currentQ.options.map((opt, i) => {
            const v = visualState(i);
            const imgUrl = currentQ.optionImageUrls[i];
            const showTick  = isTrivia && isAnswered && v.isCorrect;
            const showCross = isTrivia && isAnswered && v.isSelected && !v.isCorrect;
            return (
              <Animated.View
                key={`${currentQ.questionId}-${i}`}
                entering={FadeInDown.delay(i * 70).duration(260)}
              >
              <Pressable
                style={({ pressed }) => [
                  styles.option,
                  v.bg,
                  v.border,
                  v.dim && styles.optionDim,
                  pressed && !isAnswered && styles.optionPressed,
                ]}
                onPress={() => handlePick(i)}
                disabled={isAnswered}
              >
                <View style={[styles.letter, v.filled && styles.letterFilled]}>
                  <Text style={[styles.letterText, v.filled && styles.letterTextFilled]}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                {imgUrl ? (
                  <Image
                    source={{ uri: imgUrl }}
                    style={styles.inlineThumb}
                    contentFit="cover"
                    transition={120}
                  />
                ) : null}
                <View style={styles.inlineTextCol}>
                  <Text style={[styles.optionText, v.filled && styles.optionTextFilled]}>
                    {opt}
                  </Text>
                </View>
                {showTick  ? <Text style={styles.tick}>✓</Text>  : null}
                {showCross ? <Text style={styles.cross}>✗</Text> : null}
              </Pressable>
              </Animated.View>
            );
          });
        })()}

        {/* Reveal panel */}
        {showReveal && currentQ.doReveal && (currentQ.revealTitle || currentQ.revealDescription || currentQ.revealImageUrl) ? (
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

      {/* Next button — shown after every answer; consistent UX between
          trivia and personality (personality used to auto-advance with no
          visible cue, which read as a bug). */}
      {isAnswered ? (
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
      overflow: 'hidden',
      position: 'relative',
    },
    headerTall: {
      paddingTop: 14,
      paddingBottom: 26,
      minHeight: 240,
      justifyContent: 'space-between',
    },
    heroEmoji: {
      position: 'absolute',
      top: -14,
      right: -22,
      fontSize: 200,
      opacity: 0.16,
    },
    heroCatRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    heroCatBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    heroCatBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#1A1A1A',
      letterSpacing: 0.6,
    },
    heroTypeBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    heroTypeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.4,
    },
    confettiOverlay: {
      ...StyleSheet.absoluteFillObject,
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
      borderWidth: 1.5,
    },
    // Background + border are applied separately so grid + inline can share state
    optionNeutralBg:      { backgroundColor: c.card },
    optionNeutralBorder:  { borderColor: c.border },
    optionSelectedBg:     { backgroundColor: c.primary },
    optionSelectedBorder: { borderColor: c.primary },
    optionCorrectBg:      { backgroundColor: '#16a34a' },
    optionCorrectBorder:  { borderColor: '#16a34a' },
    optionWrongBg:        { backgroundColor: '#dc2626' },
    optionWrongBorder:    { borderColor: '#dc2626' },
    optionPressed:        { opacity: 0.7 },
    optionDim:            { opacity: 0.45 },

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
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      lineHeight: 20,
    },
    optionTextFilled: { color: '#FFFFFF' },

    inlineTextCol: { flex: 1 },
    inlineThumb: {
      width: 52,
      height: 52,
      borderRadius: 8,
      backgroundColor: c.surface,
    },

    tick:  { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },
    cross: { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },

    // Grid mode — image-on-top cards, two columns
    gridWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    gridCardWrap: {
      width: '48.5%',
    },
    gridCard: {
      width: '100%',
      borderRadius: 12,
      borderWidth: 1.5,
      backgroundColor: c.card,
      overflow: 'hidden',
    },
    gridImgWrap: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: c.surface,
    },
    gridImg: {
      width: '100%',
      height: '100%',
    },
    gridOverlayBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridBadgeCorrect: { backgroundColor: '#16a34a' },
    gridBadgeWrong:   { backgroundColor: '#dc2626' },
    gridBadgeText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },
    gridFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    gridTextCol: { flex: 1 },
    gridText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      lineHeight: 17,
      letterSpacing: -0.1,
    },

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
