import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export interface SearchBarHandle {
  focus: () => void;
}

const SearchBar = forwardRef<SearchBarHandle, Props>(function SearchBar(
  { value, onChangeText, placeholder = 'Search…', loading },
  ref,
) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }), []);

  return (
    <View style={styles.wrap}>
      <Ionicons
        name={loading ? 'sync' : 'search'}
        size={16}
        color={colors.textTertiary}
      />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
});

export default SearchBar;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 11,
      marginHorizontal: 14,
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: c.text,
      padding: 0,
      fontWeight: '500',
    },
  });
}
