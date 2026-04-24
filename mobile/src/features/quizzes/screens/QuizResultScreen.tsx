import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import ScoreArc from '../components/ScoreArc';
import AnswerReview from '../components/AnswerReview';
import ConfettiBurst from '../components/ConfettiBurst';
import { useQuizDetails } from '../hooks/useQuizzes';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'QuizResult'>;
type Rt  = RouteProp<HomeStackParamList, 'QuizResult'>;

function pickBadge(pct: number): { emoji: string; label: string; msg: string } {
  if (pct >= 90) return { emoji: '🏆', label: 'Legend',        msg: "Incredible! You're a true fan." };
  if (pct >= 70) return { emoji: '🌟', label: 'Brilliant',     msg: 'Impressive score — you know your stuff.' };
  if (pct >= 50) return { emoji: '👏', label: 'Good Try',      msg: 'Solid effort! A little more prep and you\'re there.' };
  if (pct >= 30) return { emoji: '🎯', label: 'Getting There', msg: 'Good start — try again to beat your score.' };
  return { emoji: '💡', label: 'Keep Practising', msg: 'Every legend starts somewhere. Give it another shot!' };
}

export default function QuizResultScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { id, score, answers = [] } = params;

  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: quiz, isLoading, isError, refetch } = useQuizDetails(id);

  // Scale-in animation on the hero emoji when the screen mounts
  const emojiScale = useSharedValue(0.3);
  const emojiOpacity = useSharedValue(0);
  React.useEffect(() => {
    emojiScale.value   = withSpring(1, { damping: 6, stiffness: 120 });
    emojiOpacity.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, [emojiScale, emojiOpacity]);
  const emojiAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
    opacity: emojiOpacity.value,
  }));

  if (isLoading && !quiz) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Result" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if ((isError || !quiz) && !isLoading) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Result" onBack={() => navigation.goBack()} />
        <ErrorState message="Couldn't load result" onRetry={() => refetch()} />
      </View>
    );
  }

  if (!quiz) return null;

  const isTrivia = quiz.quizTypeId === 1;
  const totalQ = quiz.quiz_questions.length;
  // Trivia: each correct = 10pts → correctCount = score / 10
  const correctCount = isTrivia ? Math.round(score / 10) : 0;
  const wrongCount   = isTrivia ? Math.max(0, totalQ - correctCount) : 0;
  const pct          = isTrivia && totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const badge        = pickBadge(isTrivia ? pct : 75);

  const matchedResult = !isTrivia
    ? quiz.results.find((r) => score >= r.lowerRange && score <= r.upperRange) || quiz.results[0] || null
    : null;

  const handlePlayAgain = () => navigation.replace('QuizPlayer', { id: String(id) });
  const handleLeaderboard = () => navigation.navigate('QuizLeaderboard', { id: String(id) });
  const handleTryAnother = () => navigation.popToTop();
  const handleShare = async () => {
    if (!quiz) return;
    const msg = isTrivia
      ? `I scored ${correctCount}/${totalQ} on "${quiz.title}" — can you beat me? 🧠 on IndiaForums`
      : matchedResult
        ? `I got "${matchedResult.title}" on "${quiz.title}" — which one are you? 🎯 on IndiaForums`
        : `I just played "${quiz.title}" on IndiaForums — try it yourself!`;
    try {
      await Share.share({ message: msg, title: quiz.title });
    } catch {
      // user cancelled or share failed — nothing to do
    }
  };

  const label = matchedResult ? matchedResult.title : badge.label;
  const emoji = matchedResult ? '🎉' : badge.emoji;
  const celebrate = (isTrivia && pct >= 70) || !!matchedResult;

  return (
    <View style={styles.screen}>
      <TopNavBack title="Your Result" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={[quiz.gradient[0], quiz.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {celebrate ? <ConfettiBurst count={24} durationMs={2800} /> : null}
          <Animated.Text style={[styles.heroEmoji, emojiAnimStyle]}>{emoji}</Animated.Text>
          <Text style={styles.heroLabel}>{label}</Text>

          {isTrivia ? (
            <Text style={styles.heroScore}>
              {correctCount} / {totalQ}
            </Text>
          ) : null}

          {matchedResult?.description ? (
            <View style={styles.matchCard}>
              <Text style={styles.matchDesc}>{matchedResult.description}</Text>
            </View>
          ) : null}
        </LinearGradient>

        {/* Stats tiles */}
        {isTrivia && !matchedResult ? (
          <View style={styles.statsRow}>
            <LinearGradient
              colors={['#FFF7ED', '#FED7AA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statTile}
            >
              <ScoreArc pct={pct} />
              <Text style={styles.statLabel}>Score</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#F0FDF4', '#BBF7D0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statTile}
            >
              <Text style={[styles.statValue, { color: '#15803D' }]}>{correctCount}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#FFF1F2', '#FECDD3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statTile}
            >
              <Text style={[styles.statValue, { color: '#BE123C' }]}>{wrongCount}</Text>
              <Text style={styles.statLabel}>Wrong</Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <LinearGradient
              colors={['#F0FDF4', '#BBF7D0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statTile}
            >
              <Text style={[styles.statValue, { color: '#15803D' }]}>✓ {totalQ}</Text>
              <Text style={styles.statLabel}>Answered</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#FFFBEB', '#FDE68A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statTile}
            >
              <Text style={[styles.statValue, { color: '#B45309' }]}>🎯 Done</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#FFF7ED', '#FED7AA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statTile}
            >
              <Text style={[styles.statValue, { color: '#C2410C' }]}>🏅 You!</Text>
              <Text style={styles.statLabel}>Your Result</Text>
            </LinearGradient>
          </View>
        )}

        {/* Message */}
        <View style={styles.msgCard}>
          <Text style={styles.msg}>{badge.msg}</Text>
          <Text style={styles.quizName}>{quiz.title}</Text>
        </View>

        {/* Per-question answer review — trivia only, when we have the answer map */}
        {isTrivia && answers.length > 0 ? (
          <AnswerReview
            questions={quiz.quiz_questions}
            answers={answers}
          />
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handlePlayAgain}
            style={({ pressed }) => [styles.actionPrimaryWrap, pressed && styles.actionPressed]}
          >
            <LinearGradient
              colors={[quiz.gradient[0], quiz.gradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionPrimary}
            >
              <Text style={styles.actionPrimaryText}>🔁 Play Again</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionSplit,
                pressed && styles.actionPressed,
              ]}
              onPress={handleShare}
            >
              <Text style={styles.actionSecondaryText}>📤 Share</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionSplit,
                pressed && styles.actionPressed,
              ]}
              onPress={handleLeaderboard}
            >
              <Text style={styles.actionSecondaryText}>🏆 Leaderboard</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.actionGhost, pressed && styles.actionPressed]}
            onPress={handleTryAnother}
          >
            <Text style={styles.actionGhostText}>Try Another Quiz</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingBottom: 32 },

    hero: {
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 26,
      paddingHorizontal: 20,
      gap: 6,
      overflow: 'hidden',
    },
    heroEmoji: { fontSize: 52 },
    heroLabel: {
      fontSize: 22,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.4,
      marginTop: 6,
      textAlign: 'center',
    },
    heroScore: {
      fontSize: 48,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -1.5,
      marginTop: 4,
    },
    matchCard: {
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
    matchDesc: {
      fontSize: 13,
      color: '#FFFFFF',
      opacity: 0.95,
      lineHeight: 19,
      textAlign: 'center',
    },

    statsRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 16,
    },
    statTile: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 6,
      borderRadius: 14,
      gap: 4,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: '#1A1A1A',
      opacity: 0.75,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    msgCard: {
      marginTop: 16,
      padding: 18,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      alignItems: 'center',
      gap: 5,
    },
    msg: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
      lineHeight: 20,
    },
    quizName: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textTertiary,
    },

    actions: {
      padding: 16,
      gap: 10,
    },
    actionPrimaryWrap: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    actionPrimary: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    actionPrimaryText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionSplit: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
    },
    actionSecondaryText: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
    },
    actionGhost: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    actionGhostText: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    actionPressed: { opacity: 0.78 },
  });
}
