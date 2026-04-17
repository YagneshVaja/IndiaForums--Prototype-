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
        {categories.map((category) => {
          const isActive = category === selected;
          return (
            <Pressable
              key={category}
              onPress={() => onSelect(category)}
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
        })}
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
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#3558F0',
    borderColor: '#3558F0',
  },
  chipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: '#555555',
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
