import React, { useMemo, useRef } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, Keyboard,
  type NativeSyntheticEvent, type TextInputSubmitEditingEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: (v: string) => void;
  onBack?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export default function SearchInputHeader({
  value,
  onChangeText,
  onSubmit,
  onBack,
  autoFocus,
  placeholder = 'Search movies, shows, celebrities…',
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inputRef = useRef<TextInput | null>(null);

  function handleSubmit(e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) {
    const v = e.nativeEvent.text.trim();
    if (!v) return;
    Keyboard.dismiss();
    onSubmit(v);
  }

  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    iconBtn: { padding: 4 },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: c.text,
      padding: 0,
    },
  });
}
