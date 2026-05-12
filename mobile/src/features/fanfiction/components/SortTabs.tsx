import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { FF_SORT_TABS, type FanFictionSortTab } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type SortId = FanFictionSortTab['id'];

interface Props {
  active: SortId;
  onChange: (id: SortId) => void;
}

export default function SortTabs({ active, onChange }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      {FF_SORT_TABS.map((tab) => {
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
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.bg,
    },
    tab: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    labelActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
  });
}
