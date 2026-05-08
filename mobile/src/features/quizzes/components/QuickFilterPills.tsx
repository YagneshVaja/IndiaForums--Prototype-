import React, { memo, useMemo } from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

export type SortKey = 'all' | 'trending' | 'quick' | 'personality' | 'trivia';

interface Props {
  active: SortKey;
  onChange: (key: SortKey) => void;
}

const PILLS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'all',         label: 'All',         icon: '🎯' },
  { key: 'trending',    label: 'Trending',    icon: '🔥' },
  { key: 'quick',       label: 'Quick',       icon: '⚡' },
  { key: 'personality', label: 'Personality', icon: '✨' },
  { key: 'trivia',      label: 'Trivia',      icon: '🧠' },
];

function QuickFilterPillsImpl({ active, onChange }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.container}
    >
      {PILLS.map((p) => {
        const isActive = active === p.key;
        return (
          <Pressable
            key={p.key}
            onPress={() => onChange(p.key)}
            style={({ pressed }) => [
              styles.pill,
              isActive && styles.pillActive,
              pressed && styles.pillPressed,
            ]}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>{p.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{p.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default memo(QuickFilterPillsImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: 4,
    },
    row: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    pillActive: {
      backgroundColor: '#1A1A1A',
      borderColor: '#1A1A1A',
    },
    pillPressed: { opacity: 0.7 },
    icon: {
      fontSize: 12,
    },
    iconActive: {
      // emoji color does not change but keep separate hook for future
    },
    label: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textSecondary,
    },
    labelActive: {
      color: '#FFFFFF',
    },
  });
}
