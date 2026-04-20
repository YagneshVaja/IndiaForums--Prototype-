import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ViewMode = 'detailed' | 'compact';

interface Props {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}

export default function ViewToggle({ mode, onChange }: Props) {
  return (
    <View style={styles.group}>
      <Pressable
        style={[styles.btn, mode === 'detailed' && styles.btnActive]}
        onPress={() => onChange('detailed')}
      >
        <Ionicons name="list" size={14} color={mode === 'detailed' ? '#3558F0' : '#8A8A8A'} />
      </Pressable>
      <Pressable
        style={[styles.btn, mode === 'compact' && styles.btnActive]}
        onPress={() => onChange('compact')}
      >
        <Ionicons name="menu" size={14} color={mode === 'compact' ? '#3558F0' : '#8A8A8A'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F5',
    borderRadius: 8,
    padding: 3,
  },
  btn: {
    width: 30,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  btnActive: {
    backgroundColor: '#FFFFFF',
  },
});
