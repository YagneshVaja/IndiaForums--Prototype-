import React from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import {
  PALETTE_IDS,
  PALETTE_META,
  themes,
  type ThemeColors,
  type PaletteId,
} from '../../../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PalettePickerSheet({ visible, onClose }: Props) {
  const colors     = useThemeStore((s) => s.colors);
  const mode       = useThemeStore((s) => s.mode);
  const palette    = useThemeStore((s) => s.palette);
  const setPalette = useThemeStore((s) => s.setPalette);
  const styles     = useThemedStyles(makeStyles);

  const handlePick = (id: PaletteId) => {
    if (id !== palette) setPalette(id);
    setTimeout(onClose, 280);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <Text style={styles.title}>Accent color</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Pick a color identity. Light and dark modes adapt to your choice.
          </Text>

          <View style={styles.list}>
            {PALETTE_IDS.map((id) => {
              const meta     = PALETTE_META[id];
              const primary  = themes[id][mode].primary;
              const soft     = themes[id][mode].primarySoft;
              const selected = id === palette;
              return (
                <Pressable
                  key={id}
                  onPress={() => handlePick(id)}
                  style={({ pressed }) => [
                    styles.row,
                    selected && { backgroundColor: soft },
                    pressed && !selected && styles.rowPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.swatchOuter,
                      { borderColor: selected ? primary : colors.border },
                    ]}
                  >
                    <View style={[styles.swatchInner, { backgroundColor: primary }]} />
                  </View>
                  <Text style={styles.label}>{meta.label}</Text>
                  {selected && (
                    <Ionicons name="checkmark" size={18} color={primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay:  { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 28,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    dragHandle: {
      alignSelf: 'center', width: 44, height: 4, borderRadius: 3,
      backgroundColor: c.border, marginTop: 4, marginBottom: 12,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: { fontSize: 15, fontWeight: '800', color: c.text },
    closeBtn: {
      width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface,
    },
    subtitle: {
      fontSize: 12, color: c.textTertiary, marginBottom: 12,
    },
    list: { gap: 4 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
    },
    rowPressed: { backgroundColor: c.surface },
    swatchOuter: {
      width: 34, height: 34, borderRadius: 17,
      borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    swatchInner: {
      width: 24, height: 24, borderRadius: 12,
    },
    label: {
      flex: 1, fontSize: 14, fontWeight: '600', color: c.text,
    },
  });
}
