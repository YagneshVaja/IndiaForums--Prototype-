import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  text: string;
}

export default function AboutCard({ text }: Props) {
  const styles = useThemedStyles(makeStyles);
  if (!text) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 14,
      marginTop: 12,
    },
    text: { fontSize: 13, lineHeight: 20, color: c.text },
  });
}
