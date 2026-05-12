import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export type SortMode = 'latest' | 'popular';

interface Props {
  mode: SortMode;
  onChange: (m: SortMode) => void;
}

const OPTIONS: { id: SortMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'latest',  label: 'Latest',  icon: 'time-outline' },
  { id: 'popular', label: 'Popular', icon: 'trending-up-outline' },
];

export default function SortDropdown({ mode, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find(o => o.id === mode) || OPTIONS[0];
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  return (
    <>
      <Pressable style={[styles.trigger, open && styles.triggerOpen]} onPress={() => setOpen(true)}>
        <Ionicons name={current.icon} size={14} color={colors.textSecondary} />
        <Text style={styles.triggerLabel}>{current.label}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            {OPTIONS.map(o => {
              const active = o.id === mode;
              return (
                <Pressable
                  key={o.id}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => { onChange(o.id); setOpen(false); }}
                >
                  <Ionicons name={o.icon} size={14} color={active ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{o.label}</Text>
                  {active && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    triggerOpen: {
      borderColor: c.primary,
    },
    triggerLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.text,
    },
    backdrop: {
      flex: 1,
      backgroundColor: c.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    dropdown: {
      backgroundColor: c.card,
      borderRadius: 12,
      minWidth: 180,
      paddingVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 10,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    optionActive: {
      backgroundColor: c.primarySoft,
    },
    optionLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    optionLabelActive: {
      color: c.primary,
    },
  });
}
