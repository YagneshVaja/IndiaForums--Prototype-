import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';

interface Props {
  name: string;
  size?: number;
  bgColor?: string;
  textColor?: string;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Initials({ name, size = 40, bgColor, textColor = '#FFFFFF' }: Props) {
  const primary = useThemeStore((s) => s.colors.primary);
  const resolvedBg = bgColor ?? primary;
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: resolvedBg },
      ]}
    >
      <Text style={[styles.label, { color: textColor, fontSize: size * 0.4 }]} numberOfLines={1}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700' },
});
