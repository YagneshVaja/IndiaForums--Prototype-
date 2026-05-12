import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  value: string;          // comma-joined usernames (the API shape)
  onChange: (v: string) => void;
  editable?: boolean;
  placeholder?: string;
}

// Internally we work with an array; the parent always sees the comma-joined
// string that the API expects in `userList`.
function fromString(v: string): string[] {
  return v
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function toString(parts: string[]): string {
  return parts.join(',');
}

export default function RecipientChipInput({
  value,
  onChange,
  editable = true,
  placeholder = 'Add a username',
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const chips = useMemo(() => fromString(value), [value]);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  const commit = useCallback(
    (raw?: string) => {
      const text = (raw ?? draft).trim().replace(/[,]+$/, '');
      if (!text) return;
      const next = Array.from(new Set([...chips, text]));
      onChange(toString(next));
      setDraft('');
    },
    [chips, draft, onChange],
  );

  const remove = useCallback(
    (name: string) => {
      onChange(toString(chips.filter((c) => c !== name)));
    },
    [chips, onChange],
  );

  const onKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }) => {
      if (e.nativeEvent.key === 'Backspace' && draft === '' && chips.length > 0) {
        remove(chips[chips.length - 1]);
      }
    },
    [chips, draft, remove],
  );

  const onChangeText = useCallback(
    (t: string) => {
      // Comma or space commits the current draft as a chip.
      if (t.endsWith(',') || t.endsWith(' ')) {
        commit(t.slice(0, -1));
      } else {
        setDraft(t);
      }
    },
    [commit],
  );

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={styles.container}
      disabled={!editable}
    >
      {chips.map((name) => (
        <View key={name} style={styles.chip}>
          <Text style={styles.chipText}>@{name}</Text>
          {editable ? (
            <Pressable onPress={() => remove(name)} hitSlop={6} style={styles.chipClose}>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onSubmitEditing={() => commit()}
        onBlur={() => commit()}
        placeholder={chips.length === 0 ? placeholder : ''}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        style={styles.input}
        returnKeyType="done"
        blurOnSubmit={false}
      />
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      minHeight: 46,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingLeft: 8,
      paddingRight: 4,
      paddingVertical: 4,
      backgroundColor: c.primarySoft,
      borderRadius: 999,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
    },
    chipClose: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 90,
      fontSize: 13,
      color: c.text,
      paddingVertical: 4,
    },
  });
}
