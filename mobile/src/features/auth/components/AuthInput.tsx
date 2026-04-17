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

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props extends TextInputProps {
  label: string;
  icon: IoniconName;
  error?: string;
  isPassword?: boolean;
}

export default function AuthInput({ label, icon, error, isPassword, ...rest }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const hasError = !!error;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, hasError && styles.inputRowError]}>
        <Ionicons name={icon} size={18} color={hasError ? '#E53935' : '#9E9E9E'} style={styles.leftIcon} />
        <TextInput
          style={styles.input}
          placeholderTextColor="#BBBBBB"
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...rest}
        />
        {isPassword && (
          <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8} style={styles.eyeButton}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#9E9E9E"
            />
          </Pressable>
        )}
      </View>
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5F5F5F',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    paddingHorizontal: 12,
    height: 44,
  },
  inputRowError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    height: '100%',
  },
  eyeButton: {
    paddingLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 2,
  },
});
