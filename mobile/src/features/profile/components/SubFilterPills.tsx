import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

export interface SubFilter<K extends string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  filters: SubFilter<K>[];
  active: K;
  onChange: (key: K) => void;
}

// Compact horizontal pill row for sub-filtering content within a profile tab.
// Mirrors the dropdown chevrons web uses (e.g. Feed → All / Scrapbook / Slambook /
// Testimonial) without forcing a multi-step tap on mobile.
export default function SubFilterPills<K extends string>({ filters, active, onChange }: Props<K>) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {filters.map((f) => {
        const isActive = f.key === active;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      gap: 8,
      paddingVertical: 10,
    },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.border,
    },
    pillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
      // Subtle lift on the active filter so it pops out of the row
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    labelActive: {
      color: c.onPrimary,
    },
  });
}
