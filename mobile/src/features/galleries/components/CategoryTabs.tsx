import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import type { GalleryCatTab } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

const GALLERY_ACCENT = '#D63636';

interface Props {
  tabs: GalleryCatTab[];
  active: string;
  onChange: (id: string) => void;
}

export default function CategoryTabs({ tabs, active, onChange }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    row: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 6,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: 'transparent',
    },
    tabActive: {
      backgroundColor: GALLERY_ACCENT,
      borderColor: GALLERY_ACCENT,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    labelActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
}
