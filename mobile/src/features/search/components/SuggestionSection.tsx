import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { entityMetadataLine } from '../utils/entityMetadata';

interface Props { entityType: string; }

export default function SuggestionSection({ entityType }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{entityMetadataLine(entityType).toUpperCase()}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 4,
      backgroundColor: c.bg,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.8,
    },
  });
}
