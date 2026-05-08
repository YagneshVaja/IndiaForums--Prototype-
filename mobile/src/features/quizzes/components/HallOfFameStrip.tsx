import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { QuizPlayer } from '../../../services/api';
import MemberAvatar from './MemberAvatar';

interface Props {
  players: QuizPlayer[];
  quizTitle: string;
  onSeeAll: () => void;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function HallOfFameStripImpl({ players, quizTitle, onSeeAll }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!players.length) return null;
  const top = players.slice(0, 5);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>🏆 Hall of Fame</Text>
          <Text style={styles.sub} numberOfLines={1}>
            Top players · {quizTitle}
          </Text>
        </View>
        <Pressable onPress={onSeeAll} hitSlop={6}>
          <Text style={styles.seeAll}>See all ›</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {top.map((p) => {
          const isPodium = p.rank <= 3;
          return (
            <View key={p.id} style={styles.item}>
              <View style={styles.avatarWrap}>
                <MemberAvatar
                  thumbnail={p.thumbnail}
                  initials={p.initials}
                  gradient={p.avatarGradient}
                  size={isPodium ? 52 : 46}
                  style={isPodium ? styles.avatarPodium : undefined}
                />
                <View style={[styles.rankBadge, isPodium ? styles.rankBadgePodium : null]}>
                  <Text style={styles.rankBadgeText}>
                    {MEDAL[p.rank] ?? `#${p.rank}`}
                  </Text>
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {p.name.length > 9 ? `${p.name.slice(0, 8)}…` : p.name}
              </Text>
              <Text style={styles.score}>{p.score} pts</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default memo(HallOfFameStripImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      marginHorizontal: 12,
      marginTop: 14,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    label: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.2,
    },
    sub: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      marginTop: 1,
    },
    seeAll: {
      fontSize: 11.5,
      fontWeight: '900',
      color: c.primary,
      letterSpacing: 0.2,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    item: {
      alignItems: 'center',
      flex: 1,
      gap: 4,
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: 2,
    },
    avatarPodium: {
      borderWidth: 2.5,
      borderColor: '#F59E0B',
    },
    rankBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 4,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.card,
    },
    rankBadgePodium: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    rankBadgeText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.textSecondary,
    },
    name: {
      fontSize: 11,
      fontWeight: '800',
      color: c.text,
      marginTop: 6,
    },
    score: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
    },
  });
}
