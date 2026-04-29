import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ForumFlair } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  flairs: ForumFlair[];
  activeId: number | null;
  onChange: (id: number | null) => void;
}

export default function FlairDropdown({ flairs, activeId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const activeLabel = useMemo(() => {
    if (activeId == null) return 'All';
    return flairs.find(f => f.id === activeId)?.name || 'All';
  }, [activeId, flairs]);

  const activeColor = activeId != null
    ? flairs.find(f => f.id === activeId)?.bgColor
    : undefined;

  return (
    <>
      <Pressable style={[styles.trigger, open && styles.triggerOpen]} onPress={() => setOpen(true)}>
        <View style={[styles.dot, { backgroundColor: activeColor || colors.textTertiary }]} />
        <Text style={styles.triggerLabel} numberOfLines={1}>{activeLabel}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator
              contentContainerStyle={styles.dropdownContent}
            >
              <Pressable
                style={[styles.option, activeId == null && styles.optionActive]}
                onPress={() => { onChange(null); setOpen(false); }}
              >
                <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
                <Text style={[styles.optionLabel, activeId == null && styles.optionLabelActive]}>All</Text>
                {activeId == null && <Ionicons name="checkmark" size={14} color={colors.primary} />}
              </Pressable>
              {flairs.map(f => {
                const active = f.id === activeId;
                return (
                  <Pressable
                    key={f.id}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => { onChange(f.id); setOpen(false); }}
                  >
                    <View style={[styles.dot, { backgroundColor: f.bgColor }]} />
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    {active && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
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
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      maxWidth: 160,
    },
    triggerOpen: {
      borderColor: c.primary,
    },
    triggerLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.text,
      flexShrink: 1,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
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
      minWidth: 200,
      maxHeight: 360,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 10,
    },
    dropdownContent: {
      paddingVertical: 6,
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
