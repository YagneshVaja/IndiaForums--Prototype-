import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

export type ViewMode = 'detailed' | 'compact';

interface Props {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}

export default function ViewToggle({ mode, onChange }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.group}>
      <Pressable
        style={[styles.btn, mode === 'detailed' && styles.btnActive]}
        onPress={() => onChange('detailed')}
      >
        <Ionicons name="list" size={14} color={mode === 'detailed' ? colors.primary : colors.textTertiary} />
      </Pressable>
      <Pressable
        style={[styles.btn, mode === 'compact' && styles.btnActive]}
        onPress={() => onChange('compact')}
      >
        <Ionicons name="menu" size={14} color={mode === 'compact' ? colors.primary : colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    group: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 3,
    },
    btn: {
      width: 30,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
    },
    btnActive: {
      backgroundColor: c.card,
    },
  });
}
