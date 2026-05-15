import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { SmartTrendingItemDto } from '../../../services/searchApi';

interface Props {
  trending: SmartTrendingItemDto[];
  onPress: (query: string) => void;
}

const HOT_RANK_CUTOFF = 3;

export default function TrendingChips({ trending, onPress }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeStore((s) => s.colors);

  const ranked = useMemo(
    () => [...trending].sort((a, b) => b.searchCount - a.searchCount),
    [trending],
  );

  if (ranked.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={14} color={colors.primary} />
        <Text style={styles.kicker}>TRENDING NOW</Text>
      </View>
      <View style={styles.chips}>
        {ranked.map((t, i) => {
          const isHot = i < HOT_RANK_CUTOFF;
          return (
            <Pressable
              key={t.query}
              onPress={() => onPress(t.query)}
              style={({ pressed }) => [
                styles.chip,
                isHot && styles.chipHot,
                pressed && (isHot ? styles.chipHotPressed : styles.chipPressed),
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${t.query}`}
            >
              {isHot ? (
                <Ionicons
                  name="flame"
                  size={12}
                  color={i === 0 ? colors.danger : colors.primary}
                  style={styles.flame}
                />
              ) : null}
              <Text style={[styles.chipText, isHot && styles.chipTextHot]}>
                {t.query}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 8, gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    kicker: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 1,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipHot: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    chipPressed: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipHotPressed: { opacity: 0.85 },
    flame: { marginRight: 5 },
    chipText: { fontSize: 13, fontWeight: '600', color: c.text },
    chipTextHot: { color: c.primary, fontWeight: '700' },
  });
}
