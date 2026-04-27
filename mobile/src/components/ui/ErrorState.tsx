import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/tokens';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
    },
    message: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: c.primary,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    retryText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.onPrimary,
    },
  });
}
