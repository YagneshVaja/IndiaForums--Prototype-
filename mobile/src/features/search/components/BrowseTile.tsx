import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  icon: IoniconName;
  onPress: () => void;
}

export default function BrowseTile({ label, icon, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${label}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    tilePressed: { opacity: 0.7 },
    iconWrap: {
      width: 32, height: 32, borderRadius: 999,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    label: { fontSize: 13, fontWeight: '600', color: c.text },
  });
}
