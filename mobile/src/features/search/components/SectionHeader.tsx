import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import {
  entitySectionLabel,
  normalizeContentType,
} from '../utils/entityMetadata';

interface Props {
  /** Either the raw `section` string from the API or a singular EntityKind. */
  label: string;
  /** When set, shows a right-aligned "See all" link tapping into a focus view. */
  onSeeAll?: () => void;
}

export default function SectionHeader({ label, onSeeAll }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeStore((s) => s.colors);
  const kind = normalizeContentType(label);
  const text = kind === 'Unknown' ? label : entitySectionLabel(kind);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{text.toUpperCase()}</Text>
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`See all ${text}`}
          style={({ pressed }) => [styles.seeAll, pressed && styles.seeAllPressed]}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 2,
    },
    seeAllPressed: { opacity: 0.6 },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },
  });
}
