import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorBlock({ message = 'Something went wrong', onRetry }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>😕</Text>
      <Text style={styles.title}>Oops!</Text>
      <Text style={styles.msg}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.btn} onPress={onRetry}>
          <Text style={styles.btnText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    emoji: { fontSize: 36 },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    msg:   { fontSize: 13, color: c.textSecondary, textAlign: 'center' },
    btn:   {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 8,
      backgroundColor: c.primary,
    },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  });
}
