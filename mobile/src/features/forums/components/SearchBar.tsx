import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search…', loading }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={loading ? 'sync' : 'search'} size={14} color="#8A8A8A" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#8A8A8A"
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color="#8A8A8A" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F2F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
  },
});
