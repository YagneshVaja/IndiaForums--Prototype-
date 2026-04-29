import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { extractApiError } from '../../../services/api';
import { useQuizDetails, useQuizPlayers } from '../hooks/useQuizzes';
import LeaderboardRow from '../components/LeaderboardRow';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'QuizDetail'>;
type Rt  = RouteProp<HomeStackParamList, 'QuizDetail'>;

export default function QuizDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { id, title: paramTitle, thumbnail: paramThumb } = params;

  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: quiz, isLoading, isError, error, refetch } = useQuizDetails(id);
  const { data: players = [] } = useQuizPlayers(id);

  const topFive = players.slice(0, 5);

  const handleStart = () => {
    if (!quiz) return;
    navigation.navigate('QuizPlayer', { id: String(quiz.id) });
  };

  const handleSeeLeaderboard = () => {
    navigation.navigate('QuizLeaderboard', { id: String(id) });
  };

  const header = (
    <TopNavBack title={paramTitle || 'Quiz'} onBack={() => navigation.goBack()} />
  );

  if (isLoading && !quiz) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError && !quiz) {
    return (
      <View style={styles.screen}>
        {header}
        <ErrorState message={extractApiError(error, "Couldn't load quiz.")} onRetry={() => refetch()} />
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={styles.screen}>
        {header}
        <ErrorState message="Quiz not found" />
      </View>
    );
  }

  const gradient = quiz.gradient;

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <LinearGradient
          colors={[gradient[0], gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {quiz.thumbnail || paramThumb ? (
            <Image
              source={{ uri: quiz.thumbnail ?? paramThumb ?? '' }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <Text style={styles.heroEmoji}>{quiz.emoji}</Text>
          )}
          <View style={styles.heroOverlay}>
            {quiz.categoryLabel ? (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{quiz.categoryLabel.toUpperCase()}</Text>
              </View>
            ) : null}
            <Text style={styles.heroTitle}>{quiz.title}</Text>
          </View>
        </LinearGradient>

        {/* Byline — prefer server-formatted authorByLine when present, else
            synthesize from author + date */}
        <View style={styles.bylineRow}>
          {quiz.authorByLine ? (
            <Text style={styles.bylineText} numberOfLines={1}>
              <Text style={styles.bylineAuthor}>{quiz.authorByLine}</Text>
            </Text>
          ) : (
            <Text style={styles.bylineText} numberOfLines={1}>
              <Text style={styles.bylineAuthor}>
                {quiz.author && quiz.author !== 'IndiaForums' ? quiz.author : 'Team IndiaForums'}
              </Text>
              {quiz.publishedFormatted ? (
                <Text style={styles.bylineDate}> · {quiz.publishedFormatted}</Text>
              ) : null}
            </Text>
          )}
        </View>

        {/* Meta row — horizontal scroll so extras don't squish */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metaRow}
          style={styles.metaRowWrap}
        >
          <View style={styles.metaCell}>
            <Text style={styles.metaValue}>❓ {quiz.questions}</Text>
            <Text style={styles.metaLabel}>Questions</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metaCell}>
            <Text style={styles.metaValue}>👥 {quiz.plays}</Text>
            <Text style={styles.metaLabel}>Plays</Text>
          </View>
          {quiz.estimatedTimeLabel ? (
            <>
              <View style={styles.divider} />
              <View style={styles.metaCell}>
                <Text style={styles.metaValue}>⏱ {quiz.estimatedTimeLabel}</Text>
                <Text style={styles.metaLabel}>Est. Time</Text>
              </View>
            </>
          ) : null}
          {quiz.views > 0 ? (
            <>
              <View style={styles.divider} />
              <View style={styles.metaCell}>
                <Text style={styles.metaValue}>👁 {quiz.views.toLocaleString()}</Text>
                <Text style={styles.metaLabel}>Views</Text>
              </View>
            </>
          ) : null}
          {quiz.directCommentCount > 0 ? (
            <>
              <View style={styles.divider} />
              <View style={styles.metaCell}>
                <Text style={styles.metaValue}>💬 {quiz.directCommentCount}</Text>
                <Text style={styles.metaLabel}>Comments</Text>
              </View>
            </>
          ) : null}
        </ScrollView>

        {/* Description */}
        {quiz.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this quiz</Text>
            <Text style={styles.description}>{quiz.description}</Text>
          </View>
        ) : null}

        {/* Possible results (range-based / personality quizzes) */}
        {quiz.results.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Possible Results</Text>
            {quiz.results.map((r) => (
              <View key={r.resultId} style={styles.resultRow}>
                <View style={styles.resultRange}>
                  <Text style={styles.resultRangeText}>
                    {r.lowerRange}–{r.upperRange}
                  </Text>
                </View>
                <View style={styles.resultBody}>
                  <Text style={styles.resultTitle}>{r.title}</Text>
                  {r.description ? (
                    <Text style={styles.resultDesc} numberOfLines={3}>{r.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Tags */}
        {quiz.tags.length > 0 ? (
          <View style={styles.tagsWrap}>
            {quiz.tags.slice(0, 8).map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Leaderboard preview */}
        <View style={styles.leaderboardHeader}>
          <Text style={styles.sectionTitle}>🏆 Leaderboard</Text>
          {players.length > 5 ? (
            <Pressable onPress={handleSeeLeaderboard} hitSlop={8}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          ) : null}
        </View>
        {topFive.length > 0 ? (
          <View style={styles.leaderboardWrap}>
            {topFive.map((p) => (
              <LeaderboardRow key={p.id} player={p} totalQuestions={quiz.questions} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyBoard}>
            <Text style={styles.emptyBoardText}>Be the first to play this quiz!</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Start button — gradient matches the quiz */}
      {quiz.quiz_questions.length > 0 ? (
        <View style={styles.footer}>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [styles.startBtnWrap, pressed && styles.startBtnPressed]}
          >
            <LinearGradient
              colors={[gradient[0], gradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startBtn}
            >
              <Text style={styles.startBtnText}>▶ Start Quiz</Text>
              <Text style={styles.startBtnCount}>{quiz.quiz_questions.length} Questions</Text>
            </LinearGradient>
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
    content: { paddingBottom: 20 },

    hero: {
      height: 200,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    heroEmoji: {
      fontSize: 72,
      alignSelf: 'center',
      marginTop: 40,
    },
    heroOverlay: {
      padding: 16,
      backgroundColor: 'rgba(0,0,0,0.35)',
      gap: 8,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.95)',
    },
    heroBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#1A1A1A',
      letterSpacing: 0.5,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.4,
      lineHeight: 28,
    },

    bylineRow: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      backgroundColor: c.card,
    },
    bylineText: {
      fontSize: 12.5,
    },
    bylineAuthor: {
      fontWeight: '800',
      color: c.text,
    },
    bylineDate: {
      fontWeight: '600',
      color: c.textTertiary,
    },
    metaRowWrap: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    metaRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 18,
    },
    metaCell: {
      alignItems: 'center',
      gap: 2,
    },
    metaValue: {
      fontSize: 18,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.3,
    },
    metaLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    divider: {
      width: 1,
      height: 24,
      backgroundColor: c.border,
    },

    resultRow: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 10,
      alignItems: 'flex-start',
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    resultRange: {
      minWidth: 54,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: c.surface,
      alignItems: 'center',
    },
    resultRangeText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.3,
    },
    resultBody: { flex: 1, gap: 2 },
    resultTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
    },
    resultDesc: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },

    section: {
      padding: 16,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      marginBottom: 8,
      letterSpacing: -0.2,
    },
    description: {
      fontSize: 13,
      lineHeight: 20,
      color: c.textSecondary,
    },

    tagsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      padding: 14,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: c.surface,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },

    leaderboardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginTop: 8,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    seeAll: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
    },
    leaderboardWrap: {
      backgroundColor: c.card,
    },
    emptyBoard: {
      padding: 20,
      alignItems: 'center',
      backgroundColor: c.card,
    },
    emptyBoardText: {
      fontSize: 13,
      color: c.textTertiary,
      fontWeight: '600',
    },

    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 14,
      paddingBottom: 24,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    startBtnWrap: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    startBtn: {
      paddingVertical: 14,
      alignItems: 'center',
      gap: 2,
    },
    startBtnPressed: { opacity: 0.82 },
    startBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    startBtnCount: {
      color: '#FFFFFF',
      opacity: 0.85,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
  });
}
