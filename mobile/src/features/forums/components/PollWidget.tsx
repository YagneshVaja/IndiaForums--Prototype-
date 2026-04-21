import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { TopicPoll } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  poll: TopicPoll;
  voted: boolean;
  votedIds: number[];
  voting: boolean;
  error: string | null;
  onVote: (optionId: number) => void;
}

export default function PollWidget({ poll, voted, votedIds, voting, error, onVote }: Props) {
  const total = poll.totalVotes || 0;
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {!!poll.question && (
        <Text style={styles.question}>{poll.question}</Text>
      )}

      <View style={styles.options}>
        {poll.options.map(opt => {
          const pct  = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
          const mine = votedIds.includes(opt.id);

          if (voted) {
            return (
              <View
                key={opt.id}
                style={[styles.result, mine && styles.resultMine]}
              >
                <View style={[styles.resultBar, { width: `${pct}%` }, mine && styles.resultBarMine]} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultText} numberOfLines={2}>{opt.text}</Text>
                  <Text style={styles.resultPct}>{pct}%</Text>
                </View>
              </View>
            );
          }

          return (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                styles.optionBtn,
                pressed && styles.optionBtnPressed,
                voting && styles.optionBtnDisabled,
              ]}
              onPress={() => onVote(opt.id)}
              disabled={voting}
            >
              <Text style={styles.optionText} numberOfLines={2}>{opt.text}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{total} {total === 1 ? 'vote' : 'votes'}</Text>
        {voting && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginTop: 12,
      padding: 12,
      backgroundColor: c.primarySoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    question: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      marginBottom: 10,
      lineHeight: 19,
    },
    options: {
      gap: 8,
    },
    optionBtn: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    optionBtnPressed: {
      backgroundColor: c.primarySoft,
    },
    optionBtnDisabled: {
      opacity: 0.5,
    },
    optionText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    result: {
      position: 'relative',
      overflow: 'hidden',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    resultMine: {
      borderColor: c.primary,
    },
    resultBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: c.primarySoft,
    },
    resultBarMine: {
      backgroundColor: c.primarySoft,
      opacity: 0.85,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    resultText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    resultPct: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    meta: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
    },
    error: {
      marginTop: 8,
      fontSize: 11,
      fontWeight: '600',
      color: c.danger,
    },
  });
}
