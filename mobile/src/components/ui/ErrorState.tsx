import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { ThemeColors } from '../../theme/tokens';

interface Props {
  message?: string;
  /** HTTP status surfaced for diagnostics (e.g. 500, 404). */
  status?: number | null;
  /** Extra context line below the message. */
  hint?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Something went wrong.',
  status,
  hint,
  onRetry,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {status || hint ? (
        <Text style={styles.detail}>
          {status ? `Status ${status}` : null}
          {status && hint ? ' · ' : null}
          {hint}
        </Text>
      ) : null}
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
      gap: 10,
    },
    message: {
      fontSize: 15,
      color: c.textSecondary,
      textAlign: 'center',
    },
    detail: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    retryButton: {
      backgroundColor: c.primary,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 6,
    },
    retryText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.onPrimary,
    },
  });
}
