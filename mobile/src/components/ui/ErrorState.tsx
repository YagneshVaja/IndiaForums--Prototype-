import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Something went wrong.', onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  message:    { fontSize: 15, color: '#5F5F5F', textAlign: 'center', marginBottom: 20 },
  button:     { backgroundColor: '#3558F0', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
