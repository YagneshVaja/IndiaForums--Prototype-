import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';

export interface ChipItem {
  id: string;
  label: string;
}

interface Props {
  chips: ChipItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'primary' | 'secondary';
}

export default function CategoryChips({ chips, activeId, onChange, variant = 'primary' }: Props) {
  const primary = variant === 'primary';
  return (
    <View style={primary ? styles.primaryWrap : styles.secondaryWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {chips.map(({ id, label }) => {
          const active = id === activeId;
          const style = primary
            ? [styles.primaryChip, active && styles.primaryChipActive]
            : [styles.secondaryChip, active && styles.secondaryChipActive];
          const textStyle = primary
            ? [styles.primaryText, active && styles.primaryTextActive]
            : [styles.secondaryText, active && styles.secondaryTextActive];
          return (
            <Pressable key={id} style={style} onPress={() => onChange(id)}>
              <Text style={textStyle} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  primaryWrap: {
    marginTop: 12,
  },
  secondaryWrap: {
    marginTop: 8,
  },
  content: {
    paddingHorizontal: 14,
    gap: 8,
  },
  primaryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F1F2F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primaryChipActive: {
    backgroundColor: '#3558F0',
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  primaryTextActive: {
    color: '#FFFFFF',
  },
  secondaryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  secondaryChipActive: {
    backgroundColor: '#EBF0FF',
    borderColor: '#3558F0',
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  secondaryTextActive: {
    color: '#3558F0',
  },
});
