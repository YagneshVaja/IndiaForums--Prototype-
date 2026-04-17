import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  title: string;
  onSeeAll?: () => void;
}

export default function SectionHeader({ title, onSeeAll }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  title:  { fontSize: 17, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#3558F0' },
});
