import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function Divider() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: { height: 1, backgroundColor: '#E2E2E2' },
});
