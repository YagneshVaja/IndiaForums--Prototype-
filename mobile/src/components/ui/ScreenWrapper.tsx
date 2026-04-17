import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  backgroundColor?: string;
}

export default function ScreenWrapper({
  children,
  backgroundColor = '#FFFFFF',
}: Props) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={[styles.container, { backgroundColor }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
