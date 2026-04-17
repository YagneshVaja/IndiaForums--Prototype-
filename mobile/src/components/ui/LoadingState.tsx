import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  height?: number;
}

export default function LoadingState({ height = 200 }: Props) {
  return (
    <View style={[styles.container, { height }]}>
      <ActivityIndicator size="large" color="#3558F0" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F7',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
});
