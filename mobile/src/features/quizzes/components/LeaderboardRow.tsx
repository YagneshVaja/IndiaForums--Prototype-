import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { QuizPlayer } from '../../../services/api';

interface Props {
  player: QuizPlayer;
  totalQuestions?: number;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardRow({ player, totalQuestions }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const scoreLabel = totalQuestions
    ? `Score: ${player.score} / ${totalQuestions}`
    : `Score: ${player.score}`;

  return (
    <View style={styles.row}>
      <View style={styles.rank}>
        <Text style={styles.rankText}>
          {MEDAL[player.rank] ?? `#${player.rank}`}
        </Text>
      </View>
      <LinearGradient
        colors={[player.avatarGradient[0], player.avatarGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.initials}>{player.initials}</Text>
      </LinearGradient>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.score} numberOfLines={1}>{scoreLabel}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.card,
    },
    rank: {
      width: 38,
      alignItems: 'center',
    },
    rankText: {
      fontSize: 14,
      fontWeight: '800',
      color: c.textSecondary,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
    },
    score: {
      fontSize: 11.5,
      fontWeight: '600',
      color: c.textTertiary,
    },
  });
}
