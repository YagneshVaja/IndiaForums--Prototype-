import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

export interface ChipItem {
  id: string;
  label: string;
}

interface Props {
  chips: ChipItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'primary' | 'secondary';
}

export default function CategoryChips({ chips, activeId, onChange, variant = 'primary' }: Props) {
  const primary = variant === 'primary';
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={primary ? styles.primaryWrap : styles.secondaryWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {chips.map(({ id, label }) => {
          const active = id === activeId;
          const style = primary
            ? [styles.primaryChip, active && styles.primaryChipActive]
            : [styles.secondaryChip, active && styles.secondaryChipActive];
          const textStyle = primary
            ? [styles.primaryText, active && styles.primaryTextActive]
            : [styles.secondaryText, active && styles.secondaryTextActive];
          return (
            <Pressable key={id} style={style} onPress={() => onChange(id)}>
              <Text style={textStyle} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    primaryWrap: {
      marginTop: 12,
    },
    secondaryWrap: {
      marginTop: 8,
    },
    content: {
      paddingHorizontal: 14,
      gap: 8,
    },
    primaryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    primaryChipActive: {
      backgroundColor: c.primary,
    },
    primaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    primaryTextActive: {
      color: '#FFFFFF',
    },
    secondaryChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryChipActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    secondaryText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textTertiary,
    },
    secondaryTextActive: {
      color: c.primary,
    },
  });
}
