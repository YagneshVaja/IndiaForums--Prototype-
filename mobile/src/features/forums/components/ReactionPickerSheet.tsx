import React from 'react';
import {
  Modal, Pressable, Text, StyleSheet, useWindowDimensions,
} from 'react-native';
import { REACTION_CODES, REACTION_META, type ReactionCode } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  anchor: AnchorRect | null;
  current: ReactionCode | null;
  onPick: (code: ReactionCode) => void;
  onClose: () => void;
}

const BUBBLE_HEIGHT = 46;
const BUBBLE_GAP    = 8;
const EDGE_PADDING  = 12;
// Approximate bubble width: 7 options × 36px + gaps + padding
const APPROX_WIDTH  = 7 * 36 + 6 * 2 + 16;

export default function ReactionPickerSheet({
  visible, anchor, current, onPick, onClose,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);

  let left = 0;
  let top  = 0;
  if (anchor) {
    left = Math.max(
      EDGE_PADDING,
      Math.min(anchor.x, screenW - APPROX_WIDTH - EDGE_PADDING),
    );
    top = anchor.y - BUBBLE_HEIGHT - BUBBLE_GAP;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {anchor && (
          <Pressable
            style={[styles.bubble, { left, top }]}
            onPress={e => e.stopPropagation()}
          >
            {REACTION_CODES.map(code => {
              const active = current === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => onPick(code)}
                  style={[styles.option, active && styles.optionActive]}
                  hitSlop={4}
                >
                  <Text style={styles.emoji}>{REACTION_META[code].emoji}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    bubble: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 24,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 12,
    },
    option: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionActive: {
      backgroundColor: c.primarySoft,
      transform: [{ scale: 1.12 }],
    },
    emoji: {
      fontSize: 18,
    },
  });
}
