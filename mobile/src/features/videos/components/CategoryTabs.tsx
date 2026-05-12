import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { VIDEO_CAT_ACCENT, type VideoCatTab } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  tabs: VideoCatTab[];
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
          const accent = VIDEO_CAT_ACCENT[tab.id] || VIDEO_CAT_ACCENT.all;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[
                styles.tab,
                isActive && { borderColor: accent.bar, backgroundColor: accent.bg },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  isActive && { color: accent.text, fontWeight: '700' },
                ]}
              >
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
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
  });
}
