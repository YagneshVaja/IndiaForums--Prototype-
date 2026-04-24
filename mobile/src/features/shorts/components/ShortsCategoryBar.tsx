import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { SHORTS_CATEGORIES, type ShortsCategory } from '../data/categories';

interface Props {
  activeId: ShortsCategory['id'];
  onChange: (id: ShortsCategory['id']) => void;
  onBack: () => void;
}

export default function ShortsCategoryBar({ activeId, onChange, onBack }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.scroll}
      >
        {SHORTS_CATEGORIES.map((cat) => {
          const active = cat.id === activeId;
          return (
            <Pressable
              key={cat.id}
              onPress={() => onChange(cat.id)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={cat.label}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  const isDark = c.bg === '#0E0F12';
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 4,
      backgroundColor: c.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 2,
    },
    backBtnPressed: {
      opacity: 0.6,
      transform: [{ scale: 0.92 }],
    },
    scroll: {
      flex: 1,
    },
    row: {
      paddingHorizontal: 6,
      paddingVertical: 8,
      gap: 6,
      alignItems: 'center',
    },
    pill: {
      paddingHorizontal: 13,
      paddingVertical: 6,
      borderRadius: 9999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    pillActive: {
      backgroundColor: c.primary,
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
