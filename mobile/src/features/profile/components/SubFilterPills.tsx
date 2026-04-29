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
      gap: 6,
      paddingVertical: 8,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    pillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.2,
    },
    labelActive: {
      color: c.onPrimary,
    },
  });
}
