import React, { useMemo, useRef } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, Keyboard, Text,
  type NativeSyntheticEvent, type TextInputSubmitEditingEventData,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  /** Optional trailing icon shown to the right of the search input. */
  trailingIcon?: {
    name: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
    badge?: number;
    accessibilityLabel?: string;
  };
}

export default function SearchInputHeader({
  value,
  onChangeText,
  onSubmit,
  onBack,
  autoFocus,
  placeholder = 'Search movies, shows, celebrities…',
  trailingIcon,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inputRef = useRef<TextInput | null>(null);

  function handleSubmit(e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) {
    const v = e.nativeEvent.text.trim();
    if (!v) return;
    Keyboard.dismiss();
    onSubmit(v);
  }

  return (
    <View style={[styles.row, { paddingTop: insets.top + 10 }]}>
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
      {trailingIcon ? (
        <Pressable
          onPress={trailingIcon.onPress}
          hitSlop={8}
          style={styles.trailingBtn}
          accessibilityLabel={trailingIcon.accessibilityLabel ?? 'Action'}
        >
          <Ionicons name={trailingIcon.name} size={20} color={colors.text} />
          {trailingIcon.badge != null && trailingIcon.badge > 0 ? (
            <View style={styles.trailingBadge}>
              <Text style={styles.trailingBadgeText}>
                {trailingIcon.badge > 99 ? '99+' : String(trailingIcon.badge)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
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
    trailingBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
      position: 'relative',
    },
    trailingBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: c.card,
    },
    trailingBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: c.onPrimary,
      lineHeight: 11,
    },
  });
}
