import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeStore } from '../../store/themeStore';

interface Props {
  height?: number;
}

export default function LoadingState({ height = 200 }: Props) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View style={[styles.container, { height }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
