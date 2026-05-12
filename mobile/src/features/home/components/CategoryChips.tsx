import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

interface ChipProps {
  category: string;
  isActive: boolean;
  onSelect: (category: string) => void;
  styles: ReturnType<typeof makeStyles>;
}

const Chip = React.memo(function Chip({ category, isActive, onSelect, styles }: ChipProps) {
  const handlePress = React.useCallback(() => onSelect(category), [onSelect, category]);
  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.chip,
        isActive ? styles.chipActive : styles.chipInactive,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={category}
    >
      <Text
        style={[
          styles.chipText,
          isActive ? styles.chipTextActive : styles.chipTextInactive,
        ]}
      >
        {category}
      </Text>
    </Pressable>
  );
});

export default function CategoryChips({
  categories,
  selected,
  onSelect,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        style={styles.scrollView}
      >
        {categories.map((category) => (
          <Chip
            key={category}
            category={category}
            isActive={category === selected}
            onSelect={onSelect}
            styles={styles}
          />
        ))}
        <View style={styles.trailingSpacer} />
      </ScrollView>
      <View style={styles.bottomBorder} />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: c.card,
    },
    scrollView: {
      paddingTop: 4,
    },
    contentContainer: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chip: {
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderWidth: 1.5,
    },
    chipActive: {
      backgroundColor: c.text,
      borderColor: c.text,
    },
    chipInactive: {
      backgroundColor: c.card,
      borderColor: c.border,
    },
    chipText: {
      fontSize: 12.5,
      fontWeight: '700',
    },
    chipTextActive: {
      color: c.card,
    },
    chipTextInactive: {
      color: c.textSecondary,
    },
    trailingSpacer: {
      width: 8,
    },
    bottomBorder: {
      height: 1,
      backgroundColor: c.border,
      marginHorizontal: 0,
    },
  });
}
