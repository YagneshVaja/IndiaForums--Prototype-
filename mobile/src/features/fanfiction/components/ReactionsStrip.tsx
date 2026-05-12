import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { FanFictionReaction } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  reactions: FanFictionReaction[];
}

function formatCount(n: number): string {
  if (!n) return '0';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function ReactionsStrip({ reactions }: Props) {
  const styles = useThemedStyles(makeStyles);
  if (!reactions || !reactions.some(r => r.count > 0)) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.label}>Reader reactions</Text>
      <View style={styles.grid}>
        {reactions.map(r => {
          const active = r.count > 0;
          return (
            <View
              key={r.id}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={styles.icon}>{r.icon}</Text>
              <Text style={[styles.count, active && styles.countActive]}>
                {formatCount(r.count)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    block: {
      marginHorizontal: 14,
      marginTop: 18,
      marginBottom: 6,
      padding: 12,
      backgroundColor: c.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    label: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    pillActive: {
      backgroundColor: c.warningSoft,
      borderColor: c.warningSoftBorder,
    },
    icon: { fontSize: 13 },
    count: { fontSize: 11, fontWeight: '700', color: c.textTertiary },
    countActive: { color: c.warning },
  });
}
