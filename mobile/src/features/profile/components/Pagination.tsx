import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => canPrev && onChange(page - 1)}
        disabled={!canPrev}
        style={[styles.btn, !canPrev && styles.btnDisabled]}
      >
        <Ionicons name="chevron-back" size={16} color={canPrev ? colors.text : colors.textTertiary} />
        <Text style={[styles.btnText, !canPrev && styles.btnTextDisabled]}>Prev</Text>
      </Pressable>
      <Text style={styles.page}>
        {page} / {totalPages}
      </Text>
      <Pressable
        onPress={() => canNext && onChange(page + 1)}
        disabled={!canNext}
        style={[styles.btn, !canNext && styles.btnDisabled]}
      >
        <Text style={[styles.btnText, !canNext && styles.btnTextDisabled]}>Next</Text>
        <Ionicons name="chevron-forward" size={16} color={canNext ? colors.text : colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 8,
      gap: 12,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    btnText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    btnTextDisabled: {
      color: c.textTertiary,
    },
    page: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
  });
}
