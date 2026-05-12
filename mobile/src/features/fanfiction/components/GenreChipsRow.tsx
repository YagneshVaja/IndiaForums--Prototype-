import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { FF_GENRE_TABS } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export default function GenreChipsRow({ active, onChange }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {FF_GENRE_TABS.map((tab) => {
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
      paddingVertical: 8,
      gap: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: {
      backgroundColor: c.text,
      borderColor: c.text,
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
    },
    labelActive: {
      color: c.card,
      fontWeight: '700',
    },
  });
}
