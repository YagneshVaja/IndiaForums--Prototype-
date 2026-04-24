import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { SHORTS_CATEGORIES, type ShortsCategory } from '../data/categories';

interface Props {
  activeId: ShortsCategory['id'];
  onChange: (id: ShortsCategory['id']) => void;
  onBack: () => void;
}

export default function ShortsCategoryBar({ activeId, onChange, onBack }: Props) {
  const brand = useThemeStore((s) => s.colors.primary);
  const styles = useMemo(() => makeStyles(brand), [brand]);

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
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

function makeStyles(brand: string) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginRight: 4,
    },
    scroll: {
      flex: 1,
    },
    row: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
      alignItems: 'center',
    },
    pill: {
      paddingHorizontal: 15,
      paddingVertical: 5,
      borderRadius: 9999,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.22)',
      backgroundColor: 'transparent',
    },
    pillActive: {
      backgroundColor: brand,
      borderColor: brand,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.6)',
    },
    labelActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
}
