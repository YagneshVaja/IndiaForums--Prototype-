import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export interface FactItem { label: string; value: string }
type MaybeItem = FactItem | false | null | undefined;

interface Props {
  title: string;
  icon: string;
  items: MaybeItem[];
}

export default function FactsCard({ title, icon, items }: Props) {
  const styles = useThemedStyles(makeStyles);
  const visible = items.filter((i): i is FactItem => !!i && !!i.value);
  if (visible.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.items}>
        {visible.map((it, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.label}>{it.label}</Text>
            <Text style={styles.value}>{it.value}</Text>
          </View>
        ))}
      </View>
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
      marginHorizontal: 14,
      marginTop: 10,
      padding: 14,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    icon:   { fontSize: 18 },
    title:  { fontSize: 14, fontWeight: '800', color: c.text },
    items:  { gap: 8 },
    item:   { flexDirection: 'row', gap: 8 },
    label:  { width: 100, fontSize: 12, color: c.textSecondary, fontWeight: '600' },
    value:  { flex: 1, fontSize: 13, color: c.text, lineHeight: 18 },
  });
}
