import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  q: string;
  onPress: () => void;
  onRemove: () => void;
}

export default function RecentRow({ q, onPress, onRemove }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.left, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Search for ${q}`}
      >
        <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
        <Text style={styles.text} numberOfLines={1}>{q}</Text>
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        style={styles.removeBtn}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${q} from recent searches`}
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    left: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    pressed: { backgroundColor: c.surface },
    text: { flex: 1, fontSize: 14, color: c.text },
    removeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  });
}
