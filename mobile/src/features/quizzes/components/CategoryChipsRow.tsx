import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { QuizCategory } from '../../../services/api';

interface Chip {
  categoryId: number | null;
  categoryName: string;
  quizCount: number;
}

interface Props {
  categories: QuizCategory[];
  activeCatId: number | null;
  onChange: (catId: number | null) => void;
}

export default function CategoryChipsRow({ categories, activeCatId, onChange }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const chips: Chip[] = useMemo(
    () => [
      { categoryId: null, categoryName: 'All', quizCount: 0 },
      ...categories.filter((c) => c.quizCount > 0),
    ],
    [categories],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.container}
    >
      {chips.map((chip) => {
        const active = activeCatId === chip.categoryId;
        return (
          <Pressable
            key={chip.categoryId ?? 'all'}
            onPress={() => onChange(chip.categoryId)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {chip.categoryName}
            </Text>
            {chip.quizCount > 0 ? (
              <Text style={[styles.chipCount, active && styles.chipCountActive]}>
                {chip.quizCount}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    row: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chipActive: {
      backgroundColor: '#F59E0B',
      borderColor: '#F59E0B',
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    chipTextActive: {
      color: '#1A1A1A',
    },
    chipCount: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
    },
    chipCountActive: {
      color: '#1A1A1A',
      opacity: 0.7,
    },
  });
}
