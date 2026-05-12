import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props extends TextInputProps {
  label: string;
  icon: IoniconName;
  error?: string;
  isPassword?: boolean;
}

export default function AuthInput({ label, icon, error, isPassword, ...rest }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const hasError = !!error;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, hasError && styles.inputRowError]}>
        <Ionicons
          name={icon}
          size={18}
          color={hasError ? colors.danger : colors.textTertiary}
          style={styles.leftIcon}
        />
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...rest}
        />
        {isPassword && (
          <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8} style={styles.eyeButton}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      gap: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      height: 44,
    },
    inputRowError: {
      borderColor: c.danger,
      backgroundColor: c.surface,
    },
    leftIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      height: '100%',
    },
    eyeButton: {
      paddingLeft: 8,
    },
    errorText: {
      fontSize: 12,
      color: c.danger,
      marginTop: 2,
    },
  });
}
