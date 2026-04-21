import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { FF_SHOW_TABS } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export default function ShowChipsRow({ active, onChange }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {FF_SHOW_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    row: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 6,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    labelActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
}
