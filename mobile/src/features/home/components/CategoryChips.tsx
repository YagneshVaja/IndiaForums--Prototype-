import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

interface ChipProps {
  category: string;
  isActive: boolean;
  onSelect: (category: string) => void;
}

const Chip = React.memo(function Chip({ category, isActive, onSelect }: ChipProps) {
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
          />
        ))}
        <View style={styles.trailingSpacer} />
      </ScrollView>
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    paddingTop: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
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
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E2E2',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: '#5F5F5F',
  },
  trailingSpacer: {
    width: 8,
  },
  bottomBorder: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 0,
  },
});
