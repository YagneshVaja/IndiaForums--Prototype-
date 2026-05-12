import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isPending: boolean;
  disabled?: boolean;
  bottomInset?: number;
}

const MAX_CHARS = 5000;
// Show a character meter only when we're approaching the limit — the rest of
// the time the composer should feel uncluttered.
const METER_THRESHOLD = Math.floor(MAX_CHARS * 0.8);

export default function ThreadComposer({
  value,
  onChange,
  onSend,
  isPending,
  disabled,
  bottomInset = 0,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const canSend = !!value.trim() && !isPending && !disabled;
  const overMeter = value.length >= METER_THRESHOLD;
  const overLimit = value.length >= MAX_CHARS;

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(bottomInset, 8) }]}>
      {overMeter ? (
        <Text style={[styles.meter, overLimit && styles.meterDanger]}>
          {value.length} / {MAX_CHARS}
        </Text>
      ) : null}
      <View style={styles.wrap}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.slice(0, MAX_CHARS))}
          placeholder="Write a reply…"
          placeholderTextColor={colors.textTertiary}
          multiline
          editable={!disabled}
          style={styles.input}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            !canSend && styles.sendBtnDisabled,
            pressed && canSend && styles.pressed,
          ]}
        >
          {isPending ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Ionicons name="send" size={16} color={colors.onPrimary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    outer: {
      backgroundColor: c.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: 4,
    },
    meter: {
      alignSelf: 'flex-end',
      paddingHorizontal: 14,
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
    },
    meterDanger: {
      color: c.danger,
    },
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      paddingHorizontal: 8,
      paddingTop: 6,
    },
    input: {
      flex: 1,
      marginLeft: 8,
      maxHeight: 120,
      minHeight: 40,
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 14,
      color: c.text,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.96 }],
    },
  });
}
