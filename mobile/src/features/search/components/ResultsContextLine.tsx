import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { entityMetadataLine } from '../utils/entityMetadata';

interface Props {
  count: number;
  query: string;
  activeEntityType: string | null;
}

export default function ResultsContextLine({ count, query, activeEntityType }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const noun = activeEntityType
    ? pluralize(entityMetadataLine(activeEntityType), count)
    : `result${count === 1 ? '' : 's'}`;
  return (
    <View style={styles.row}>
      <Text style={styles.text} numberOfLines={1}>
        <Text style={styles.bold}>{count} {noun}</Text> for "<Text style={styles.bold}>{query}</Text>"
      </Text>
    </View>
  );
}

function pluralize(label: string, n: number): string {
  if (n === 1) return label;
  // "Celebrity" -> "Celebrities" — handle the y→ies case.
  // Everything else: "Movie" -> "Movies", "TV Show" -> "TV Shows", etc.
  if (/[bcdfghjklmnpqrstvwxz]y$/i.test(label)) return label.slice(0, -1) + 'ies';
  return label + 's';
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.bg,
    },
    text: { fontSize: 12, color: c.textSecondary },
    bold: { fontWeight: '700', color: c.text },
  });
}
