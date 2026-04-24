import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { extractApiError, type QuizPlayer } from '../../../services/api';
import LeaderboardRow from '../components/LeaderboardRow';
import { useQuizPlayers, useQuizDetails } from '../hooks/useQuizzes';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'QuizLeaderboard'>;
type Rt  = RouteProp<HomeStackParamList, 'QuizLeaderboard'>;

const keyExtractor = (p: QuizPlayer) => String(p.id);

export default function QuizLeaderboardScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { id } = params;

  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: quiz } = useQuizDetails(id);
  const { data: players = [], isLoading, isError, error, refetch } = useQuizPlayers(id);

  const title = quiz?.title ? `🏆 ${quiz.title}` : 'Leaderboard';

  if (isLoading && players.length === 0) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Leaderboard" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError && players.length === 0) {
    return (
      <View style={styles.screen}>
        <TopNavBack title="Leaderboard" onBack={() => navigation.goBack()} />
        <ErrorState message={extractApiError(error, "Couldn't load leaderboard.")} onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopNavBack title="Leaderboard" onBack={() => navigation.goBack()} />
      <FlatList
        data={players}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <LeaderboardRow player={item} totalQuestions={quiz?.questions} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            <Text style={styles.sub}>
              Top {players.length} {players.length === 1 ? 'player' : 'players'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyTitle}>No scores yet</Text>
            <Text style={styles.emptySub}>Be the first to complete this quiz!</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      padding: 18,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.3,
    },
    sub: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.3,
    },
    empty: { padding: 40, alignItems: 'center', gap: 6 },
    emptyEmoji: { fontSize: 36, marginBottom: 4 },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    emptySub: { fontSize: 12, color: c.textTertiary, textAlign: 'center' },
  });
}
