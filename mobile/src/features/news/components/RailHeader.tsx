import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  // Ionicons name shown left of the title — picks the section's metaphor
  // (play-circle for videos, images for photos, etc.).
  icon: IoniconName;
  title: string;
  // When provided, renders a "See All →" pill on the right and fires this
  // on tap. Omit it to hide the action entirely (e.g. when the rail's
  // listing screen doesn't exist yet).
  onSeeAll?: () => void;
}

// Shared header for News-tab rails (Videos / Photo Galleries / Trending
// Movies / Visual Stories). Replaced four near-identical inline headers,
// each defining the same titleRow / sectionTitle / seeAll styles. Keeping
// the markup in one place means any future tweak (icon size, accent
// colour, "See All" treatment) lands in every rail at once.
function RailHeaderImpl({ icon, title, onSeeAll }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See All →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const RailHeader = memo(RailHeaderImpl);
export default RailHeader;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    seeAll: { fontSize: 12, fontWeight: '700', color: c.primary },
  });
}
