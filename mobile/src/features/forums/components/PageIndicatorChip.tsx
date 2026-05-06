import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  currentPage: number;
  totalPages: number;
  onPress: () => void;
}

export default function PageIndicatorChip({ currentPage, totalPages, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Page ${safePage} of ${totalPages}. Tap to jump.`}
    >
      <Ionicons name="layers-outline" size={12} color={colors.primary} />
      <Text style={styles.text}>
        Page <Text style={styles.textBold}>{safePage}</Text>
        <Text style={styles.textMuted}> / {totalPages}</Text>
      </Text>
      <View style={styles.chev}>
        <Ionicons name="chevron-down" size={11} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoft,
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: 999,
    },
    pressed: {
      opacity: 0.75,
    },
    text: {
      fontSize: 11,
      fontWeight: '600',
      color: c.primary,
      letterSpacing: 0.1,
    },
    textBold: {
      fontWeight: '800',
    },
    textMuted: {
      fontWeight: '600',
      opacity: 0.75,
    },
    chev: {
      marginLeft: 1,
    },
  });
}
